## MODIFIED Requirements

### Requirement: Every operation is fully documented
Every operation in the OpenAPI document SHALL have a `summary`, an `operationId`, at least one 2xx response with a schema, and an error response whose schema is the shared `ErrorResponse`. The document SHALL include the converted schema of every request body, query parameter, path parameter and response that a route declares. `ErrorResponse` SHALL describe the API's error body: `statusCode` (integer), `message` (a string or an array of strings) and an optional `error` (string). Every route SHALL document a 500 `ErrorResponse`. Routes that take input SHALL also document a 400 `ErrorResponse`. The document SHALL define a bearer security scheme. Every operation SHALL declare its security: operations that require a session token SHALL require the bearer scheme and document a 401 `ErrorResponse`, and public operations SHALL declare an empty security list (`security: []`).

#### Scenario: Health operation
- **WHEN** the document is generated
- **THEN** `GET /health` has a `summary`, an `operationId`, a 200 response whose schema has a `status` property, a 500 response that references `ErrorResponse`, and `security: []`

#### Scenario: All input kinds are converted
- **WHEN** the document is generated for a route that declares a body, a query, a path parameter and a response schema
- **THEN** the document contains the converted schema for each of the four

#### Scenario: Authenticated operation
- **WHEN** the document is generated
- **THEN** `components.securitySchemes` defines an HTTP bearer scheme, and `GET /me` requires it and has a 401 response that references `ErrorResponse`

#### Scenario: Public webhook operation
- **WHEN** the document is generated
- **THEN** `POST /webhooks/clerk` has `security: []` and a 400 response that references `ErrorResponse`, and no 401 response

#### Scenario: Operation without declared security
- **WHEN** an operation in a copy of the file has no `security` and the document has no global `security`
- **THEN** linting that copy with the API's lint configuration exits non-zero

### Requirement: Changes declare their API contract impact
The project's rules SHALL make every proposal state its API contract impact: either "API contract: no change", or the endpoints it adds, changes or removes, each stated as public or authenticated. When a change adds or changes endpoints, its tasks SHALL include:
- declaring the request and response schemas and the Swagger decorators;
- regenerating `openapi.json`;
- e2e tests that parse responses with their schemas.

`CLAUDE.md` SHALL describe these API conventions, including that routes require a session token unless marked public.

#### Scenario: Proposing an endpoint change
- **WHEN** a change that adds an endpoint is proposed
- **THEN** its `proposal.md` lists the new endpoint under its API contract impact and says whether it is public or authenticated, and its `tasks.md` includes regenerating `openapi.json` and an e2e test that parses the endpoint's response with its schema
