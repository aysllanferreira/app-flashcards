# clerk-user-sync Specification

## Purpose

Keeps the `users` table in step with the identity provider's (Clerk's) accounts: a new account is created and provisioned exactly once, whether its first API request or its `user.created` webhook arrives first, and email changes and deletions reach the database through signed webhooks.

## Requirements

### Requirement: A new account is provisioned exactly once
When an identity provider user without an account first reaches the API, through an authenticated request or a `user.created` or `user.updated` webhook, the API SHALL create in one transaction their `users` row, one deck preset named `Default`, and their own copies of the built-in note types (Basic, Basic (and reversed card), Cloze). For an existing account it SHALL create nothing. Concurrent first arrivals for the same user SHALL still leave exactly one `users` row, one `Default` preset and three note types.

#### Scenario: First authenticated request
- **WHEN** a valid token for a user with no account sends `GET /me`
- **THEN** the database holds one `users` row with that `clerk_user_id`, one deck preset named `Default` and three note types owned by it

#### Scenario: Repeated requests
- **WHEN** the same user sends `GET /me` a second time
- **THEN** the counts of their `users` rows, deck presets and note types are unchanged

#### Scenario: Concurrent first requests
- **WHEN** two `GET /me` requests with valid tokens for the same new user are sent at the same time
- **THEN** both return 200 with the same `id`, and the database holds one `users` row, one `Default` preset and three note types for that user

### Requirement: The webhook endpoint accepts only signed events
The API SHALL expose a public `POST /webhooks/clerk` that verifies each request's Svix signature (`svix-id`, `svix-timestamp`, `svix-signature`) over the raw request body with the configured signing secret (`CLERK_WEBHOOK_SIGNING_SECRET`). A request with missing signature headers, an invalid signature or a stale timestamp, or any request when no signing secret is configured, SHALL get 400 with an `ErrorResponse` body and change nothing. A verified event SHALL get 200 with an acknowledgement body. The endpoint SHALL never answer 401. Verified event types other than `user.created`, `user.updated` and `user.deleted` SHALL be acknowledged and ignored.

#### Scenario: Bad signature
- **WHEN** a `user.created` payload is posted with a signature made with a different secret
- **THEN** the response is 400, the body parses as `ErrorResponse`, and no `users` row is created

#### Scenario: Missing signature headers
- **WHEN** a payload is posted without the `svix-*` headers
- **THEN** the response is 400 and the body parses as `ErrorResponse`

#### Scenario: Unhandled event type
- **WHEN** a correctly signed `session.created` event is posted
- **THEN** the response is 200 and the database is unchanged

### Requirement: Created and updated accounts carry the primary email
For a verified `user.created` or `user.updated` event, the API SHALL provision the account if it doesn't exist and SHALL set its `email` to the event's primary email address, or to `null` when the user has none.

#### Scenario: Account created by the webhook
- **WHEN** a correctly signed `user.created` event for a new user with primary email `learner@example.com` is posted
- **THEN** the response is 200, and that user has one `users` row with `email` `learner@example.com`, one `Default` preset and three note types

#### Scenario: Webhook after the first request
- **WHEN** a user's account was created by a `GET /me` request, and then a correctly signed `user.created` event for that user is posted
- **THEN** their `email` is set from the event, and they still have one `Default` preset and three note types

#### Scenario: Email change
- **WHEN** a correctly signed `user.updated` event changes an existing user's primary email to `new@example.com`
- **THEN** their `users.email` is `new@example.com`

### Requirement: Deleted accounts are removed with everything they own
For a verified `user.deleted` event, the API SHALL delete the account with that `clerk_user_id`, which removes every row the user owns. When no such account exists, it SHALL acknowledge the event and change nothing.

#### Scenario: Account deletion
- **WHEN** a correctly signed `user.deleted` event is posted for a user who owns decks, notes, cards and review logs
- **THEN** the response is 200 and no row with that user's id remains in `users`, `decks`, `notes`, `cards` or `review_logs`

#### Scenario: Unknown account
- **WHEN** a correctly signed `user.deleted` event is posted for a user with no account
- **THEN** the response is 200 and the database is unchanged

### Requirement: Events are safe to replay
Delivering the same verified event more than once SHALL leave the database as delivering it once does.

#### Scenario: Duplicate delivery
- **WHEN** the same correctly signed `user.created` event is posted twice
- **THEN** both responses are 200, and the user has one `users` row, one `Default` preset and three note types

### Requirement: Local webhook setup is documented
The API README SHALL explain how to receive the identity provider's webhooks on a developer machine: exposing the local API through a tunnel, creating an endpoint in the provider's development instance subscribed to `user.created`, `user.updated` and `user.deleted`, and putting its signing secret in the local, git-ignored environment file.

#### Scenario: Following the README
- **WHEN** a developer follows the README's webhook steps and then signs up a new account in the web app
- **THEN** the local database has a `users` row for that account with its email
