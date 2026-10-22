# AGENTS.md

Rules for any AI agent working in this repository. Read fully before changing anything.

## Project

Local Actions, Just Like GitHub: a VS Code extension that runs GitHub Actions workflows locally with nektos/act and shows runs in a page that looks and behaves like the GitHub Actions tab.

- Display name: Local Actions, Just Like GitHub
- Package name: local-actions-just-like-github
- Publisher: filispeen
- Settings and command prefix: localActions
- License: ask the user before creating LICENSE. Do not pick one silently.

## Reference

https://github.com/SanjulaGanepola/github-local-actions is licensed Apache-2.0. Use it for architecture ideas only. Do not copy code, icons, images or text. If adapting any code ever looks necessary, stop and ask the user first, because Apache-2.0 requires the license text, attribution and change notices.

## GitHub Actions page

The Actions page must look and behave like the real GitHub Actions page.

- Build it with @primer/css (MIT, GitHub's own design system), bundled locally in the webview. No CDN.
- The user may keep a saved copy of the GitHub Actions page in a local reference/ folder. Use it only as a visual and structural reference.
- Never bundle, ship, commit or copy code, markup, scripts, styles or assets from that saved copy. The reference/ folder must be listed in .gitignore and .vscodeignore.
- Before using any other asset (for example Octicons), verify its license and ask the user if unsure.

## Tech stack (defaults, change only after asking the user)

- TypeScript with strict mode, VS Code Extension API
- esbuild for the extension host and for the webview bundle
- React + TypeScript for the webview app
- @primer/css for styling the Actions page
- yaml package for parsing workflows
- Vitest for pure logic tests, @vscode/test-electron for integration tests
- ESLint (flat config)
- Runtime dependency: nektos/act CLI. Docker Engine is optional (host runners work without it).

## Structure

```
src/
  extension.ts
  act/          detection, argv building, process runner, output parser
  workflows/    discovery, YAML parsing, file watching
  runs/         run model, persistent store, log files
  views/        tree views (Components, Workflows, Settings)
  webview/
    host/       panel provider, typed message protocol
    app/        React app (Actions page)
  shared/       types shared by host and webview
test/
```

## Commands

- npm run compile: build host and webview once
- npm run watch: rebuild on change
- npm run lint
- npm test: unit tests
- npm run test:integration
- npm run package: build a .vsix

Details are in BUILD.md.

## Git and versioning (mandatory)

### Commits

1. After finishing a set of changes, always commit. Never end a task with a dirty working tree.
2. One logical change per commit. Stage only related files.
3. Before committing, run lint, compile and tests. If any fail, fix them first. Never commit a broken build.
4. Commit message: short, imperative, no emojis. Example: Add workflow discovery.
5. Include the PLAN.md checkbox updates in the same commit as the work they describe.
6. Never push, force-push, amend published commits or rewrite history unless the user asks.

### Versioning

1. Format: vMAJOR.MINOR.PATCH (semantic versioning).
   - MAJOR: breaking change (removed or renamed settings or commands, incompatible storage format)
   - MINOR: new backward-compatible feature
   - PATCH: backward-compatible fix or internal change
2. Before 1.0.0 the version stays 0.MINOR.PATCH.
3. Where the version lives:
   - Git tag: vX.Y.Z (with the leading v)
   - package.json "version": X.Y.Z (without the v, because npm and vsce require plain semver)
   - CHANGELOG.md heading: ## vX.Y.Z
4. The agent must not change the version, edit it in package.json or CHANGELOG.md, or create a tag on its own.
5. If the agent sees a need for a version bump (phase completed, user-visible feature, bug fix, breaking change), it must stop and ask the user/supervisor. The question states the proposed version and the reason in one or two sentences.
6. Only after explicit approval: update package.json and CHANGELOG.md, commit as "Release vX.Y.Z", create the local tag vX.Y.Z.
7. If no bump looks needed, commit without touching the version.

## Code style

- No comments in code unless the user requests them.
- No emojis in code or commit messages.
- No em dashes in code.
- No any type. Small focused modules. Prefer pure functions for parsing and argv building.
- Build process arguments as arrays. Never concatenate a shell command string from user input.

## Security

- Store secrets only through context.secrets (SecretStorage). Never in settings.json, run history, logs or git.
- Redact secret values from stored logs.
- Webview: strict CSP with a nonce, no remote scripts, validate every message from the webview.

## Trademark

Do not use the GitHub logo or marks in the icon or UI. Use an original icon. Do not ship GitHub's own page code or assets (see the GitHub Actions page section). Mentioning GitHub Actions in text to describe compatibility is fine.

## Working rules

- Follow PLAN.md in order. Do not add features outside it.
- Verify act flags and output against the installed act version (act --help and real runs). Do not assume.
- Ask the user when a decision is ambiguous or irreversible: license, publishing, renaming, swapping a dependency.
- Definition of done: compiles, lints, tests pass, PLAN.md updated, changes committed.
