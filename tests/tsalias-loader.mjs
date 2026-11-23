// Resolve hook for "@/*" path alias, used only by the Node test runner.
const PROJECT_ROOT = new URL("..", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const withoutAlias = specifier.slice(2);
    const candidates = [
      `${PROJECT_ROOT}${withoutAlias}.ts`,
      `${PROJECT_ROOT}${withoutAlias}.tsx`,
      `${PROJECT_ROOT}${withoutAlias}/index.ts`,
    ];
    for (const candidate of candidates) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // try next candidate
      }
    }
  }
  return nextResolve(specifier, context);
}
