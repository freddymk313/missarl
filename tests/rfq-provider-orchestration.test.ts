// ============================================================================
// Mocked tests for the RFQ provider orchestration (Gemini + OpenRouter).
// No real API keys or network calls: fetch and the Gemini SDK are mocked.
// Run: node --experimental-strip-types --import ./tests/register-loader.mjs --test tests/rfq-provider-orchestration.test.ts
// ============================================================================

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Module-level mock state, injected via environment and global.fetch
// ---------------------------------------------------------------------------
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

let nextResponseFactory: (() => Response) | null = null;
let fetchCalls: Array<{ url: string; init: RequestInit }> = [];

type AnyRecord = Record<string, unknown>;

function installFetchMock(factory: () => Response) {
  nextResponseFactory = factory;
  // @ts-expect-error override for tests
  globalThis.fetch = (url: string, init: RequestInit) => {
    fetchCalls.push({ url, init });
    return Promise.resolve(factory());
  };
}

// The Gemini SDK is not invoked when GEMINI_API_KEY is absent... but the
// orchestrator expects Gemini to be tried first, so we mock the SDK-level
// network: with a fake key set, @google/genai hits Google's endpoint via
// fetch, which our mock intercepts.
function validOpenRouterBody() {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            clientRfqReference: "RFQ-2026-001",
            documentTitle: "Test RFQ",
            totalExtractedItems: 2,
            items: [
              {
                sourceLineNumber: 1,
                pageNumber: 1,
                designation: "Cable",
                description: "Cable 3G2.5",
                quantity: 10,
                rawUnit: "PCS",
                confidence: "high",
                extractionNotes: null,
              },
              {
                sourceLineNumber: 2,
                pageNumber: 1,
                designation: "Switch",
                description: "Switch 24 ports",
                quantity: 2,
                rawUnit: "EA",
                confidence: "medium",
                extractionNotes: null,
              },
            ],
          }),
        },
      },
    ],
  };
}

function validGeminiBody() {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                clientRfqReference: "RFQ-2026-001",
                documentTitle: "Test RFQ",
                totalExtractedItems: 1,
                items: [
                  {
                    sourceLineNumber: 1,
                    pageNumber: 1,
                    designation: "Cable",
                    description: "Cable 3G2.5",
                    quantity: 10,
                    rawUnit: "PCS",
                    confidence: "high",
                    extractionNotes: null,
                  },
                ],
              }),
            },
          ],
        },
      },
    ],
  };
}

const PDF_BYTES = Buffer.from(
  "%PDF-1.4 test document bytes for extraction",
  "utf8",
);

beforeEach(() => {
  fetchCalls = [];
  nextResponseFactory = null;
  process.env.GEMINI_API_KEY = "fake-gemini-key";
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_RFQ_MODEL;
  delete process.env.RFQ_OPENROUTER_FREE_FALLBACK;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

describe("RFQ provider orchestration", () => {
  test("1. Gemini succeeds without calling OpenRouter", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    process.env.RFQ_OPENROUTER_FREE_FALLBACK = "true";
    installFetchMock(() => Response.json(validGeminiBody()));

    const { extractRFQ } = await import("@/lib/rfq/extractor");
    const result = await extractRFQ({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
    });

    assert.equal(result.provider, "gemini");
    assert.equal(result.fallbackAttempted, false);
    assert.ok(fetchCalls.every((c) => !c.url.includes("openrouter.ai")));
  });

  test("2. Gemini returns 503 and fallback is disabled", async () => {
    installFetchMock(() =>
      Response.json({ error: { code: 503, message: "overloaded" } }, { status: 503 }),
    );

    const { extractRFQ } = await import("@/lib/rfq/extractor");
    await assert.rejects(
      extractRFQ({ bytes: PDF_BYTES, mimeType: "application/pdf" }),
      (err: AnyRecord) => {
        assert.equal(err.status, 503);
        return true;
      },
    );
    assert.ok(fetchCalls.every((c) => !c.url.includes("openrouter.ai")));
  });

  test("3. Gemini returns 503 and fallback is enabled: OpenRouter is tried once", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    process.env.RFQ_OPENROUTER_FREE_FALLBACK = "true";
    let call = 0;
    installFetchMock(() => {
      call++;
      if (call <= 4) {
        // 4 Gemini candidate models all return 503
        return Response.json(
          { error: { code: 503, message: "overloaded" } },
          { status: 503 },
        );
      }
      return Response.json(validOpenRouterBody());
    });

    const { extractRFQ } = await import("@/lib/rfq/extractor");
    const result = await extractRFQ({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
    });

    assert.equal(result.provider, "openrouter");
    assert.equal(result.fallbackAttempted, true);
    const orCalls = fetchCalls.filter((c) => c.url.includes("openrouter.ai"));
    assert.equal(orCalls.length, 1, "OpenRouter must be tried exactly once");
  });

  test("4. OpenRouter returns valid structured output and normalizes", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    process.env.RFQ_OPENROUTER_FREE_FALLBACK = "true";
    installFetchMock(() => Response.json(validOpenRouterBody()));

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    const result = await extractRFQWithOpenRouter({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
      timeoutMs: 10_000,
    });

    assert.equal(result.extracted.totalExtractedItems, 2);
    assert.equal(result.extracted.items[0].designation, "Cable");
  });

  test("5. OpenRouter returns 429: transient error, no silent paid switch", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    installFetchMock(() =>
      Response.json({ error: { message: "rate limited" } }, { status: 429 }),
    );

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    await assert.rejects(
      extractRFQWithOpenRouter({
        bytes: PDF_BYTES,
        mimeType: "application/pdf",
        timeoutMs: 10_000,
      }),
      (err: AnyRecord) => {
        assert.equal(err.status, 503);
        assert.equal(err.category, "CAPACITY_UNAVAILABLE");
        return true;
      },
    );
  });

  test("6. OpenRouter returns 5xx: transient error", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    installFetchMock(() => Response.json({}, { status: 502 }));

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    await assert.rejects(
      extractRFQWithOpenRouter({
        bytes: PDF_BYTES,
        mimeType: "application/pdf",
        timeoutMs: 10_000,
      }),
      (err: AnyRecord) => {
        assert.equal(err.status, 502);
        return true;
      },
    );
  });

  test("7. Both providers fail: combined clear error", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    process.env.RFQ_OPENROUTER_FREE_FALLBACK = "true";
    installFetchMock(() => Response.json({}, { status: 503 }));

    const { extractRFQ } = await import("@/lib/rfq/extractor");
    await assert.rejects(
      extractRFQ({ bytes: PDF_BYTES, mimeType: "application/pdf" }),
      (err: AnyRecord) => {
        assert.equal(err.category, "CAPACITY_UNAVAILABLE");
        return true;
      },
    );
  });

  test("8. OpenRouter API key is missing: error before network call", async () => {
    process.env.RFQ_OPENROUTER_FREE_FALLBACK = "true";
    installFetchMock(() => Response.json(validOpenRouterBody()));

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    await assert.rejects(
      extractRFQWithOpenRouter({
        bytes: PDF_BYTES,
        mimeType: "application/pdf",
        timeoutMs: 10_000,
      }),
      (err: AnyRecord) => {
        assert.equal(err.status, 503);
        assert.equal(err.category, "AUTH_ERROR");
        return true;
      },
    );
    assert.equal(fetchCalls.length, 0, "No network call without API key");
  });

  test("9. PDF input is sent as base64 file content part", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    installFetchMock(() => Response.json(validOpenRouterBody()));

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    await extractRFQWithOpenRouter({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
      timeoutMs: 10_000,
    });

    const body = JSON.parse(fetchCalls[0].init.body as string);
    const part = body.messages[1].content[0];
    assert.equal(part.type, "file");
    assert.ok(part.file.file_data.startsWith("data:application/pdf;base64,"));
  });

  test("10. JPEG and PNG inputs use image_url parts", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    installFetchMock(() => Response.json(validOpenRouterBody()));

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    for (const mime of ["image/jpeg", "image/png"] as const) {
      fetchCalls = [];
      await extractRFQWithOpenRouter({
        bytes: Buffer.from("fake-image"),
        mimeType: mime,
        timeoutMs: 10_000,
      });
      const body = JSON.parse(fetchCalls[0].init.body as string);
      const part = body.messages[1].content[0];
      assert.equal(part.type, "image_url");
      assert.ok(part.image_url.url.startsWith(`data:${mime};base64,`));
    }
  });

  test("11. Source item order is preserved in normalized output", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    const outOfOrder = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              totalExtractedItems: 3,
              items: [
                { designation: "B", description: "B", confidence: "high" },
                { designation: "A", description: "A", confidence: "high" },
                { designation: "C", description: "C", confidence: "high" },
              ],
            }),
          },
        },
      ],
    };
    installFetchMock(() => Response.json(outOfOrder));

    const { extractRFQWithOpenRouter } = await import(
      "@/lib/openrouter/rfq-extractor"
    );
    const result = await extractRFQWithOpenRouter({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
      timeoutMs: 10_000,
    });
    // Normalizer reassigns sequential sourceLineNumber in array order
    assert.deepEqual(
      result.extracted.items.map((i: AnyRecord) => i.designation),
      ["B", "A", "C"],
    );
    assert.deepEqual(
      result.extracted.items.map((i: AnyRecord) => i.sourceLineNumber),
      [1, 2, 3],
    );
  });

  test("12. No document content or secret is logged", async () => {
    process.env.OPENROUTER_API_KEY = "fake-or-key";
    const logs: string[] = [];
    const originalLog = console.warn;
    const originalInfo = console.info;
    const originalError = console.error;
    console.warn = (...a: unknown[]) => logs.push(a.join(" "));
    console.info = (...a: unknown[]) => logs.push(a.join(" "));
    console.error = (...a: unknown[]) => logs.push(a.join(" "));
    try {
      installFetchMock(() => Response.json({}, { status: 500 }));
      const { extractRFQWithOpenRouter } = await import(
        "@/lib/openrouter/rfq-extractor"
      );
      await extractRFQWithOpenRouter({
        bytes: PDF_BYTES,
        mimeType: "application/pdf",
        timeoutMs: 10_000,
      }).catch(() => {});
    } finally {
      console.warn = originalLog;
      console.info = originalInfo;
      console.error = originalError;
    }

    const source = readFileSync("lib/openrouter/rfq-extractor.ts", "utf8");
    assert.ok(!source.includes("base64"), "no base64 logging in source");
    for (const line of logs) {
      assert.ok(
        !line.includes(PDF_BYTES.toString()),
        "document bytes must never appear in logs",
      );
      assert.ok(!line.includes("fake-or-key"), "API keys never logged");
    }
  });

  test("13. Catalogue matching and prefill logic are untouched", async () => {
    // Guard test: public surface of the matching module is unchanged
    const matching = await import("@/lib/db/rfq-item-matching");
    assert.equal(
      typeof matching.matchExtractedRFQItems,
      "function",
      "matchExtractedRFQItems must remain exported and functional",
    );
    assert.equal(
      typeof matching.getActiveCatalogueSummariesForMatching,
      "function",
    );
  });
});
