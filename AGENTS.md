# Repository Guidelines

## Project Structure & Module Organization

This is a Yarn 4 TypeScript workspace. The CLI entry point lives in `clis/gpt/src`, with prompt templates and other CLI assets in `clis/gpt/assets`. Shared workspace packages are under `packages/*`: `arguments`, `configuration`, `gc`, and `telemetry`. Tests are colocated with source files as `*.test.ts`; sample telemetry data currently lives under `output/`. Workspace slots for future apps exist in `services/` and `websites/`.

## Build, Test, and Development Commands

- `yarn install`: install dependencies using the checked-in Yarn release.
- `yarn cli --help`: run the ChatGPT translation CLI through `cli-gpt`.
- `yarn build`: build every workspace package with TypeScript.
- `yarn test`: run Vitest with coverage enabled.
- `yarn cleanup`: remove generated `dist` folders across workspaces.
- `yarn format:check` / `yarn format:fix`: check or rewrite formatting with Oxfmt.
- `yarn lint` / `yarn lint:fix`: check or autofix lint issues with Oxlint.
- `yarn gitleaks:detect`: scan the repository for committed secrets.

Use Node 24.x (`.nvmrc` specifies `24.16.0`) and Yarn `4.15.0`.

## Coding Style & Naming Conventions

Use TypeScript ESM modules and keep exports close to each package's `index.ts`. Include `.js` on local ESM import/export specifiers in TypeScript source so emitted files run under Node. Formatting is 2 spaces, LF line endings, no semicolons, single quotes, and 120-column lines. Oxlint and Oxfmt are the source of truth for linting and formatting. Prefer descriptive camelCase for variables/functions, PascalCase for types/classes/enums, and kebab- or dot-style filenames that match nearby files, such as `command.translate.ts` and `telemetry.test.ts`.

## Testing Guidelines

Vitest is configured through `vitest.config.ts` for ESM TypeScript. Add tests beside the code they cover using the `*.test.ts` suffix. Use `vitest` imports, and mock external services such as OpenAI with local fakes rather than live API calls. Run `yarn test` before submitting changes; coverage output is generated under `coverage/`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative or descriptive subjects such as `workspace configuration` and `fixed type usage in unit tests`. Keep the first line concise and focused on one change. Pull requests should include a clear summary, test results, linked issues when applicable, and CLI output or screenshots only when behavior changes are visible to users.

## Security & Configuration Tips

Keep API keys and other secrets out of Git. Store local secrets in `.secrets`, load them through `.envrc`, and prefer `OPENAI_API_TOKEN` for CLI runs. Husky hooks run secret checks on staged changes; resolve findings before pushing.
