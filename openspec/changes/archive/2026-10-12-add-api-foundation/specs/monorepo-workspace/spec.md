## MODIFIED Requirements

### Requirement: One command runs both apps for development
Running `pnpm dev` at the root SHALL start the web app on `http://localhost:3000` and the API on `http://localhost:3001` at the same time, from a single process the developer can stop with one interrupt. The API's liveness check SHALL be `GET /health`.

#### Scenario: Both apps respond
- **WHEN** a developer runs `pnpm dev` at the root and waits for both apps to start
- **THEN** an HTTP GET to `http://localhost:3000` returns status 200 with the web home page
- **AND** an HTTP GET to `http://localhost:3001/health` returns status 200 with the body `{"status":"ok"}`
