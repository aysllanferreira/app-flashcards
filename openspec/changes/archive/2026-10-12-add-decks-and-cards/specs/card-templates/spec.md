## Purpose

One shared, tested implementation of how notes become cards: rendering card templates, finding cloze numbers, deciding which cards a note produces and sanitizing field HTML, used by both the API and the web app so they can never disagree.

## ADDED Requirements

### Requirement: Shared package for both apps
The card rules SHALL live in one workspace package, `card-templates`, with no I/O, that both `apps/api` and `apps/web` import. `pnpm --filter card-templates test` SHALL run its tests. A change to the package SHALL mark both apps as affected.

#### Scenario: Both apps depend on it
- **WHEN** `pnpm turbo ls --filter=...card-templates` is run
- **THEN** the output lists `card-templates`, `api` and `web`

### Requirement: Rendering templates
Rendering a template with a note's fields SHALL replace `{{Field Name}}` with that field's value, `{{FrontSide}}` (on a back template) with the rendered front, and a reference to an unknown or empty field with nothing. For a given cloze number, `{{cloze:Field}}` SHALL show the active deletion as `[...]` on the front (or `[hint]` when written `{{cN::text::hint}}`) and as its text on the back, and SHALL show every other deletion's text on both sides.

#### Scenario: Basic card
- **WHEN** the template `{{Front}}` is rendered with Front `hola`
- **THEN** the result is `hola`

#### Scenario: Back with FrontSide
- **WHEN** the back template `{{FrontSide}}<hr id=answer>{{Back}}` is rendered with Front `hola` and Back `hello`
- **THEN** the result contains `hola` before the `<hr id=answer>` and `hello` after it

#### Scenario: Cloze front and back
- **WHEN** `{{cloze:Text}}` is rendered for cloze 1 with Text `{{c1::Madrid}} is in {{c2::Spain}}`
- **THEN** the front shows `[...]` in place of `Madrid` and shows `Spain`, and the back shows both `Madrid` and `Spain`

### Requirement: Cloze numbers
The package SHALL list the distinct cloze numbers that appear in a text, in ascending order, for markers `{{cN::text}}` and `{{cN::text::hint}}` where N is a positive integer.

#### Scenario: Repeated and unordered numbers
- **WHEN** the text is `{{c2::b}} {{c1::a}} {{c2::c}}`
- **THEN** the cloze numbers are 1 and 2

### Requirement: Cards a note produces
For a standard note type, the cards a note produces SHALL be one per template whose front renders to content that is not empty once markup and whitespace are removed. For a cloze note type, they SHALL be one per cloze number found in the fields its template references with `cloze:`.

#### Scenario: Reversed note type with one field filled
- **WHEN** the cards for a Basic (and reversed card) note with Front `hola` and an empty Back are computed
- **THEN** only the first template produces a card

#### Scenario: Cloze note type
- **WHEN** the cards for a Cloze note with Text `{{c1::a}} {{c2::b}} {{c2::c}}` are computed
- **THEN** cards with cloze numbers 1 and 2 are produced

### Requirement: Sanitizing field HTML
Sanitizing a field value SHALL keep only `b`, `strong`, `i`, `em`, `u` and `br` elements, with no attributes, SHALL drop `script` and `style` elements with their content, SHALL put a `<br>` between consecutive `p` or `div` blocks, and SHALL unwrap every other element, keeping its text. Sanitizing an already sanitized value SHALL return it unchanged. Sanitizing SHALL give the same result in Node.js and in the browser.

#### Scenario: Allowed and dropped markup
- **WHEN** `<p onclick="x()"><b>bold</b> <a href="javascript:alert(1)">link</a><script>bad()</script></p>` is sanitized
- **THEN** the result is `<b>bold</b> link`

#### Scenario: Paragraphs become line breaks
- **WHEN** `<p>uno</p><p><i>dos</i></p>` is sanitized
- **THEN** the result is `uno<br><i>dos</i>`

#### Scenario: Idempotent
- **WHEN** a sanitized value is sanitized again
- **THEN** the result equals the input
