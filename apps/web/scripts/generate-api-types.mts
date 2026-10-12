// Generates app/_lib/api-types.ts from the API's committed contract,
// apps/api/openapi.json. Run with `pnpm --filter web generate:api` after any
// contract change; __tests__/api-types.test.ts fails while the file is stale.
import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const CONTRACT = new URL("../../api/openapi.json", import.meta.url);
export const API_TYPES_FILE = new URL("../app/_lib/api-types.ts", import.meta.url);

const HEADER = `// Generated from apps/api/openapi.json by \`pnpm --filter web generate:api\`.
// Do not edit by hand.

`;

/** The TypeScript types for the current contract, as the file should read. */
export async function generateApiTypes(): Promise<string> {
  const contract = JSON.parse(await readFile(CONTRACT, "utf8"));
  return HEADER + astToString(await openapiTS(contract));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(API_TYPES_FILE, await generateApiTypes());
  console.log(`Wrote ${API_TYPES_FILE.pathname}`);
}
