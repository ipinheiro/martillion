# Martillion

An unlimited-play trivia game in the spirit of [Krillion](https://krillion.io), re-themed
around Marx. Seven prompts per uprising, 30 seconds each; the rarer the answer, the more
it scores. A gift, made with love and historical materialism.

## Play

https://ipinheiro.github.io/martillion/

## Develop

No build step and no runtime dependencies. Serve the folder and open it:

    uv run python -m http.server 8123

Install the one dev tool (Biome, for lint and format) and run the checks (Node 24+):

    npm install
    npm test          # unit and data tests
    npm run check     # lint and format check
    npm run format    # rewrite files to the house format

Every module starts with `// @ts-check`, so an editor with TypeScript support (VS Code out of
the box) type-checks the JSDoc comments as you type.

## Add questions

Edit `data/questions.json` following the schema in
`docs/superpowers/specs/2026-09-01-martillion-design.md`, then run `npm test` -
the validation suite enforces the authoring rules.
