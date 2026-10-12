// @vitest-environment node
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import {
  API_TYPES_FILE,
  generateApiTypes,
} from "../scripts/generate-api-types.mjs";

// The web app's API types must match the API's committed contract.
test("app/_lib/api-types.ts is generated from the current openapi.json", async () => {
  const committed = await readFile(API_TYPES_FILE, "utf8");

  expect(
    committed === (await generateApiTypes()),
    "app/_lib/api-types.ts is stale: run `pnpm --filter web generate:api`",
  ).toBe(true);
});
