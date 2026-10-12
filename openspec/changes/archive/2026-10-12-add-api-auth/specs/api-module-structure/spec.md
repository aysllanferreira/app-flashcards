## MODIFIED Requirements

### Requirement: Environment is validated at startup
The API SHALL validate its environment before it starts listening. `NODE_ENV` SHALL be one of `development`, `test` or `production`, defaulting to `development`. `PORT` SHALL be an integer port, defaulting to 3001. `SWAGGER_UI` SHALL be a boolean, defaulting to `false`. `DATABASE_URL` SHALL be a `postgres://` or `postgresql://` URL; outside production it SHALL default to the local Docker database, and in production it SHALL be required. `WEB_ORIGIN` SHALL be a comma-separated list of `http` or `https` origins (scheme, host and optional port, with no path); outside production it SHALL default to `http://localhost:3000`, and in production it SHALL be required. `CLERK_JWT_KEY` (the identity provider's PEM public key) and `CLERK_SECRET_KEY` SHALL be optional, but in production at least one of them SHALL be set. `CLERK_WEBHOOK_SIGNING_SECRET` SHALL be optional outside production and required in production. If any value is invalid or a required value is missing, the API SHALL exit with a non-zero code and an error that names the variable.

#### Scenario: Defaults
- **WHEN** the API starts with none of these variables set
- **THEN** it listens on port 3001, uses the local Docker database and accepts browser requests from `http://localhost:3000`

#### Scenario: Invalid port
- **WHEN** the API starts with `PORT=abc`
- **THEN** it exits with a non-zero code and its error output names `PORT`

#### Scenario: Invalid database URL
- **WHEN** the API starts with `DATABASE_URL=not-a-url`
- **THEN** it exits with a non-zero code and its error output names `DATABASE_URL`

#### Scenario: Database URL missing in production
- **WHEN** the API starts with `NODE_ENV=production` and no `DATABASE_URL`
- **THEN** it exits with a non-zero code and its error output names `DATABASE_URL`

#### Scenario: Invalid web origin
- **WHEN** the API starts with `WEB_ORIGIN=http://localhost:3000/app`
- **THEN** it exits with a non-zero code and its error output names `WEB_ORIGIN`

#### Scenario: Web origin missing in production
- **WHEN** the API starts with `NODE_ENV=production`, a valid `DATABASE_URL`, a `CLERK_JWT_KEY`, a `CLERK_WEBHOOK_SIGNING_SECRET` and no `WEB_ORIGIN`
- **THEN** it exits with a non-zero code and its error output names `WEB_ORIGIN`

#### Scenario: No token verification key in production
- **WHEN** the API starts with `NODE_ENV=production`, a valid `DATABASE_URL`, `WEB_ORIGIN` and `CLERK_WEBHOOK_SIGNING_SECRET`, and neither `CLERK_JWT_KEY` nor `CLERK_SECRET_KEY`
- **THEN** it exits with a non-zero code and its error output names `CLERK_JWT_KEY` and `CLERK_SECRET_KEY`

#### Scenario: Webhook secret missing in production
- **WHEN** the API starts with `NODE_ENV=production`, a valid `DATABASE_URL`, `WEB_ORIGIN` and `CLERK_JWT_KEY`, and no `CLERK_WEBHOOK_SIGNING_SECRET`
- **THEN** it exits with a non-zero code and its error output names `CLERK_WEBHOOK_SIGNING_SECRET`
