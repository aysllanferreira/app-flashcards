## MODIFIED Requirements

### Requirement: Every operation is fully documented
Every operation in the OpenAPI document SHALL have a `summary`, an `operationId`, at least one 2xx response with a schema, and an error response whose schema is the shared `ErrorResponse`. The document SHALL include the converted schema of every request body, query parameter, path parameter and response that a route declares. `ErrorResponse` SHALL describe the API's error body: `statusCode` (integer), `message` (a string or an array of strings) and an optional `error` (string). Every route SHALL document a 500 `ErrorResponse`. Routes that take input SHALL also document a 400 `ErrorResponse`. Routes that address a record by id, or name one in their input, SHALL document a 404 `ErrorResponse`, and routes that can conflict with an existing record SHALL document a 409 `ErrorResponse`. The document SHALL define a bearer security scheme. Every operation SHALL declare its security: operations that require a session token SHALL require the bearer scheme and document a 401 `ErrorResponse`, and public operations SHALL declare an empty security list (`security: []`).

#### Scenario: Health operation
- **WHEN** the document is generated
- **THEN** `GET /health` has a `summary`, an `operationId`, a 200 response whose schema has a `status` property, a 500 response that references `ErrorResponse`, and `security: []`

#### Scenario: All input kinds are converted
- **WHEN** the document is generated for a route that declares a body, a query, a path parameter and a response schema
- **THEN** the document contains the converted schema for each of the four

#### Scenario: Authenticated operation
- **WHEN** the document is generated
- **THEN** `components.securitySchemes` defines an HTTP bearer scheme, and `GET /me` requires it and has a 401 response that references `ErrorResponse`

#### Scenario: Not found and conflict
- **WHEN** the document is generated
- **THEN** `PATCH /decks/{id}` has 404 and 409 responses that reference `ErrorResponse`, and `GET /decks` has neither

#### Scenario: Public webhook operation
- **WHEN** the document is generated
- **THEN** `POST /webhooks/clerk` has `security: []` and a 400 response that references `ErrorResponse`, and no 401 response

#### Scenario: Operation without declared security
- **WHEN** an operation in a copy of the file has no `security` and the document has no global `security`
- **THEN** linting that copy with the API's lint configuration exits non-zero
