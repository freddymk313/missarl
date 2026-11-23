// Node test-runner resolve hook: maps "@/*" imports to project files so the
// TS test files can import modules exactly like the Next.js app does.
// Usage: node --experimental-strip-types --import ./tests/register-loader.mjs --test <files>
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(pathToFileURL(new URL("./tsalias-loader.mjs", import.meta.url)));
