## ADDED Requirements

### Requirement: Public pages stay public
`/`, `/sign-in` and `/sign-up` SHALL render for signed-out visitors without a redirect. Pages that show a user's own data SHALL require sign-in and send signed-out visitors to `/sign-in`, returning them to the requested page afterwards.

#### Scenario: Home page while signed out
- **WHEN** a visitor with no session requests `/`
- **THEN** the page renders with status 200 and no redirect to `/sign-in`

#### Scenario: Private page while signed out
- **WHEN** a visitor with no session requests `/decks`
- **THEN** they are redirected to `/sign-in`

## REMOVED Requirements

### Requirement: All routes stay public
**Reason**: The deck and card screens show a user's own data, so they require sign-in. Only the pages that were public stay public.
**Migration**: Replaced by "Public pages stay public": `/`, `/sign-in` and `/sign-up` still render for signed-out visitors.

### Requirement: Signed-in users see their account
**Reason**: A signed-in user on `/` is now sent to the deck list, the first screen backed by the API, so the account section on `/` is gone. Its job of proving the web app calls the API as the user moves to the deck screens.
**Migration**: The signed-in user's email stays visible in the identity provider's user menu. The "page still renders when the API is down" behavior moves to the deck list (`web-deck-screens`, "Deck list"). `GET /me` is unchanged in the API.
