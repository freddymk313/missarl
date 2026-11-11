// ============================================================================
// API Endpoint Test for /api/statements/[clientId]/pdf
// ============================================================================

import crypto from "crypto";
import { mockDb } from "../lib/mock-db";

async function testEndpoints() {
  console.log("=== TESTING STATEMENT PDF API ENDPOINTS ===\n");

  const baseUrl = "http://localhost:3000";
  const validClientId = "b0000000-0000-0000-0000-000000000001";

  // 1. Unauthenticated Request -> Expect 401
  console.log("TEST: Unauthenticated request...");
  const unauthRes = await fetch(`${baseUrl}/api/statements/${validClientId}/pdf`);
  console.log(`Status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401, got ${unauthRes.status}`);
  }
  console.log("✓ Unauthenticated request rejected with 401.");

  // Create an Admin session token in mockDb
  const adminRawToken = "admin_test_token_statement_1234567890";
  const adminTokenHash = crypto.createHash("sha256").update(adminRawToken).digest("hex");
  mockDb.sessions.push({
    user_id: "11111111-1111-1111-1111-111111111111", // SUPER_ADMIN
    token_hash: adminTokenHash,
    ip_address: "127.0.0.1",
    user_agent: "Node-Test",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });

  // Create a Price Collector session token in mockDb
  const collectorRawToken = "collector_test_token_statement_12345";
  const collectorTokenHash = crypto.createHash("sha256").update(collectorRawToken).digest("hex");
  mockDb.sessions.push({
    user_id: "33333333-3333-3333-3333-333333333333", // PRICE_COLLECTOR
    token_hash: collectorTokenHash,
    ip_address: "127.0.0.1",
    user_agent: "Node-Test",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });

  // 2. Price Collector Request -> Expect 403 Forbidden
  console.log("\nTEST: Price Collector unauthorized request...");
  const collectorRes = await fetch(`${baseUrl}/api/statements/${validClientId}/pdf`, {
    headers: {
      Cookie: `mis_session=${collectorRawToken}`,
    },
  });
  console.log(`Status: ${collectorRes.status} (Expected: 403)`);
  if (collectorRes.status !== 403) {
    throw new Error(`Expected 403, got ${collectorRes.status}`);
  }
  console.log("✓ Price Collector access denied with 403 Forbidden.");

  // 3. Non-existent Client Request -> Expect 404
  console.log("\nTEST: Non-existent client request...");
  const notFoundRes = await fetch(`${baseUrl}/api/statements/00000000-0000-0000-0000-000000000099/pdf`, {
    headers: {
      Cookie: `mis_session=${adminRawToken}`,
    },
  });
  console.log(`Status: ${notFoundRes.status} (Expected: 404)`);
  if (notFoundRes.status !== 404) {
    throw new Error(`Expected 404, got ${notFoundRes.status}`);
  }
  console.log("✓ Non-existent client returns 404 Not Found.");

  // 4. Invalid Date Format Request -> Expect 400
  console.log("\nTEST: Invalid date format request...");
  const invalidDateRes = await fetch(`${baseUrl}/api/statements/${validClientId}/pdf?startDate=not-a-date`, {
    headers: {
      Cookie: `mis_session=${adminRawToken}`,
    },
  });
  console.log(`Status: ${invalidDateRes.status} (Expected: 400)`);
  if (invalidDateRes.status !== 400) {
    throw new Error(`Expected 400, got ${invalidDateRes.status}`);
  }
  console.log("✓ Invalid date filter rejected with 400 Bad Request.");

  // 5. Valid Admin Request (Inline Preview) -> Expect 200 OK & application/pdf
  console.log("\nTEST: Valid Admin request (inline preview)...");
  const inlineRes = await fetch(`${baseUrl}/api/statements/${validClientId}/pdf?disposition=inline`, {
    headers: {
      Cookie: `mis_session=${adminRawToken}`,
    },
  });
  console.log(`Status: ${inlineRes.status} ${inlineRes.statusText}`);
  const contentType = inlineRes.headers.get("content-type");
  const contentDisp = inlineRes.headers.get("content-disposition");
  console.log(`Content-Type: ${contentType}`);
  console.log(`Content-Disposition: ${contentDisp}`);

  if (inlineRes.status !== 200) {
    const errText = await inlineRes.text();
    throw new Error(`Expected 200, got ${inlineRes.status}: ${errText}`);
  }
  if (!contentType?.includes("application/pdf")) {
    throw new Error(`Expected application/pdf, got ${contentType}`);
  }
  if (!contentDisp?.includes("inline")) {
    throw new Error(`Expected inline disposition, got ${contentDisp}`);
  }
  const inlineBuf = await inlineRes.arrayBuffer();
  console.log(`Received PDF stream: ${inlineBuf.byteLength} bytes.`);
  console.log("✓ Admin preview PDF route verified successfully.");

  // 6. Valid Admin Request (Attachment Download) -> Expect 200 OK & attachment
  console.log("\nTEST: Valid Admin request (attachment download)...");
  const attachRes = await fetch(`${baseUrl}/api/statements/${validClientId}/pdf?disposition=attachment`, {
    headers: {
      Cookie: `mis_session=${adminRawToken}`,
    },
  });
  console.log(`Status: ${attachRes.status} ${attachRes.statusText}`);
  const attachDisp = attachRes.headers.get("content-disposition");
  console.log(`Content-Disposition: ${attachDisp}`);
  if (!attachDisp?.includes("attachment")) {
    throw new Error(`Expected attachment disposition, got ${attachDisp}`);
  }
  console.log("✓ Admin attachment download route verified successfully.");

  console.log("\n=== ALL ENDPOINT SECURITY & HTTP TESTS PASSED! ===");
}

testEndpoints().catch((err) => {
  console.error("Endpoint test failed:", err);
  process.exit(1);
});
