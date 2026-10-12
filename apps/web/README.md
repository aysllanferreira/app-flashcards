# web

The Next.js web app for the flashcards app: decks, notes with a live card preview, and the card browser. It lives in this Turborepo monorepo next to the NestJS API (`apps/api`) and the shared `card-templates` package (`packages/card-templates`).

The rules for working on it (Tailwind and shadcn/ui, design tokens, both themes and both widths, server-side API calls, the tests) are in the "Web (apps/web)", "Design" and "Shared packages" sections of [`CLAUDE.md`](../../CLAUDE.md). The approved prototype is [`design/decks-and-cards/prototype.html`](../../design/decks-and-cards/prototype.html).

## Run it

From the repo root:

```bash
pnpm install
docker compose up -d --wait db
pnpm dev
```

`pnpm dev` starts the web app on `http://localhost:3000` and the API on `http://localhost:3001`, after building `card-templates`. Signed-out visitors see the landing page; signed-in users land on `/decks`.

### Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | The Clerk development instance's keys |
| `API_URL` | The API's base URL, read only on the server. Defaults to `http://localhost:3001` outside production and is required by `next start` |
| `E2E_CLERK_USER_EMAIL` | In `.env.test.local`: the Clerk test user the signed-in Playwright tests sign in as |

All of these files are git-ignored except `.env.example`.

## Test it

| Command | What it does |
|---|---|
| `pnpm --filter web test` | Vitest (jsdom): components, the home page, and a check that the API types match `apps/api/openapi.json`. No server or network needed |
| `pnpm --filter web test:e2e` | Playwright against the production build at 375 px (`phone`) and 1280 px (`desktop`): redirects, theme, layout, the full deck and note flow, overflow and axe checks. Needs the database (`docker compose up -d --wait db`) and port 3000 free; starts the API too. Signed-in tests are skipped without `E2E_CLERK_USER_EMAIL` |
| `pnpm --filter web screenshots` | Regenerates the review screenshots under `design/decks-and-cards/screenshots/` |

The first Playwright run needs a browser: `pnpm --filter web exec playwright install chromium`.

## Common tasks

**After an API contract change**, regenerate the typed client and commit it:

```bash
pnpm --filter web generate:api
```

It writes `app/_lib/api-types.ts` from `apps/api/openapi.json`; `pnpm --filter web test` fails while it is stale.

**Add a shadcn/ui component:**

```bash
pnpm --filter web dlx shadcn@latest add <name>
```

It lands in `components/ui/` and imports `cn` from shadcn's `cn` package. Style it only with the theme tokens.

**Change a color, font or radius:** edit the `app-tokens` blocks in `design/decks-and-cards/prototype.html` first, then copy them unchanged into `app/globals.css`.
