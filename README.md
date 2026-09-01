# Martillion

An unlimited-play trivia game in the spirit of [Krillion](https://krillion.io), re-themed
around Marx. Seven prompts per uprising, 30 seconds each; the rarer the answer, the more
it scores. A gift, made with love and historical materialism.

## Play

https://ipinheiro.github.io/martillion/

## Develop

No build step, no dependencies. Serve the folder and open it:

    uv run python -m http.server 8123

Run the tests (Node 20+):

    npm test

## Add questions

Edit `data/questions.json` following the schema in
`docs/superpowers/specs/2026-09-01-martillion-design.md`, then run `npm test` -
the validation suite enforces the authoring rules.
