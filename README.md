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

The bank lives in `data/questions/`, one file per topic. Edit the topic's file following the
schema and authoring rules in `docs/superpowers/specs/2026-09-02-second-uprising-design.md`,
then run `npm test` - the data test enforces the rules. An answer the bank does not recognise
scores zero, so cover the common answers exhaustively.

## Sprites

The pixel art lives in `js/sprites.js` as character grids. Render every sprite to PNG for a
look with `node scripts/preview-sprites.mjs`; the files land in `/tmp/martillion-sprites/`.
