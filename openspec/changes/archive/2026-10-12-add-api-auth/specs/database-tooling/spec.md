## MODIFIED Requirements

### Requirement: A seed builds a realistic local dataset
`pnpm --filter api db:seed` SHALL clear the data in the app database and create a demo user, provisioned the same way as an account that signs up (the `Default` deck preset and the built-in note types), plus nested decks, at least 10,000 cards spread across states and due dates, and review logs, then refresh the planner statistics. It SHALL refuse to run when `NODE_ENV` is `production`.

#### Scenario: Seeding locally
- **WHEN** `pnpm --filter api db:seed` runs against the migrated local database
- **THEN** it exits 0, `cards` holds at least 10,000 rows, and the demo user owns a deck preset named `Default` and the three built-in note types

#### Scenario: Seeding in production is refused
- **WHEN** `pnpm --filter api db:seed` runs with `NODE_ENV=production`
- **THEN** it exits non-zero without changing any data
