## Purpose

Guarantees that API handlers only receive input that matches their declared schemas, and that responses only contain the fields their declared response schemas allow.

## ADDED Requirements

### Requirement: Requests are validated against declared schemas
Every route input that declares a schema (body, query or path parameter) SHALL be validated before the handler runs, for every route in the app. Invalid input SHALL be rejected with status 400 and a JSON body whose `message` is an array with one entry per invalid field, each entry naming the field's path. Valid input SHALL reach the handler as the value parsed by the schema. Request and response schemas SHALL be Zod schemas. Each schema SHALL be defined in its module's `dto/` folder together with its inferred type.

#### Scenario: Invalid body
- **WHEN** a client sends a body that breaks a route's body schema (for example a missing required field `title`)
- **THEN** the response status is 400 and `message` is an array containing an entry that names `title`

#### Scenario: Invalid path parameter
- **WHEN** a route declares its `id` path parameter as a UUID and a client sends `not-a-uuid`
- **THEN** the response status is 400

#### Scenario: Valid body
- **WHEN** a client sends a body that matches the route's body schema
- **THEN** the handler receives the parsed value and the response status is the route's success status

### Requirement: Responses are shaped by declared schemas
When a route declares a response schema, the response body SHALL be produced by that schema. Fields the handler returns that the schema doesn't list SHALL NOT appear in the response.

#### Scenario: Extra field is dropped
- **WHEN** a handler returns an object with a field that its response schema doesn't list
- **THEN** that field is absent from the response body

#### Scenario: Health response matches its schema
- **WHEN** a client sends `GET /health`
- **THEN** the body parses with the health response schema without errors
