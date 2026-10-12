## Purpose

Lets the API know who is calling it: every route requires a valid session token from the identity provider unless it is explicitly public, the caller's account is available at `GET /me`, and only the web app's origins can call the API from a browser.

## ADDED Requirements

### Requirement: Routes require a valid session token
Every API route SHALL require a session token issued by the identity provider (Clerk), sent as `Authorization: Bearer <token>`, unless the route is public. The API SHALL answer 401 with an `ErrorResponse` body when the header is missing, is not a bearer token, or carries a token whose signature is invalid, that has expired or is not yet valid, or whose authorized party (`azp`) is not one of the configured web origins (`WEB_ORIGIN`). When no token verification key is configured, every non-public route SHALL answer 401. A request with a valid token SHALL be handled as the account whose identity provider user id is the token's subject.

#### Scenario: No token
- **WHEN** a client sends `GET /me` without an `Authorization` header
- **THEN** the response is 401 and the body parses as `ErrorResponse`

#### Scenario: Malformed token
- **WHEN** a client sends `GET /me` with `Authorization: Bearer not-a-jwt`
- **THEN** the response is 401 and the body parses as `ErrorResponse`

#### Scenario: Expired token
- **WHEN** a client sends `GET /me` with a correctly signed token whose `exp` is in the past
- **THEN** the response is 401 and the body parses as `ErrorResponse`

#### Scenario: Token from another origin
- **WHEN** a client sends `GET /me` with a correctly signed, unexpired token whose `azp` is `https://evil.example` and `WEB_ORIGIN` is `http://localhost:3000`
- **THEN** the response is 401 and the body parses as `ErrorResponse`

#### Scenario: Valid token
- **WHEN** a client sends `GET /me` with a correctly signed, unexpired token whose `azp` is in `WEB_ORIGIN`
- **THEN** the response is 200

### Requirement: Public routes need no token
A route marked public SHALL be served without a token, and SHALL NOT answer 401 because a token is missing. `GET /health`, the docs at `/docs` and `/docs-json` (when served) and the identity provider's webhook endpoint SHALL be public.

#### Scenario: Health without a token
- **WHEN** a client sends `GET /health` without an `Authorization` header
- **THEN** the response is 200 with `{"status":"ok"}`

#### Scenario: Docs without a token
- **WHEN** the API runs outside production and a client sends `GET /docs-json` without an `Authorization` header
- **THEN** the response is 200

### Requirement: The caller's account
`GET /me` SHALL return the caller's account with status 200: its `id`, `email` (a string, or `null` when not yet known), `timezone`, `dayRolloverHour`, `remindersOn` and `createdAt`. When the caller has no account yet, the API SHALL create and provision it before answering (see the `clerk-user-sync` capability), so a valid token never gets a 401 or 404 because the account is new.

#### Scenario: First request from a new account
- **WHEN** a valid token for an identity provider user with no account sends `GET /me`
- **THEN** the response is 200, the body parses as `MeResponse`, its `email` is `null`, its `timezone` is `UTC` and its `dayRolloverHour` is 4

#### Scenario: Same account on a later request
- **WHEN** the same user sends `GET /me` again
- **THEN** the response is 200 with the same `id` as the first response

### Requirement: Browser calls only from the web origins
The API SHALL allow cross-origin browser requests, including preflight requests with an `Authorization` header, only from the origins listed in `WEB_ORIGIN`. A request from any other origin SHALL receive no `Access-Control-Allow-Origin` header.

#### Scenario: Preflight from the web app
- **WHEN** a client sends `OPTIONS /me` with `Origin: http://localhost:3000`, `Access-Control-Request-Method: GET` and `Access-Control-Request-Headers: authorization`, and `WEB_ORIGIN` is `http://localhost:3000`
- **THEN** the response has `Access-Control-Allow-Origin: http://localhost:3000` and allows the `authorization` header

#### Scenario: Preflight from another origin
- **WHEN** the same preflight is sent with `Origin: https://evil.example`
- **THEN** the response has no `Access-Control-Allow-Origin` header
