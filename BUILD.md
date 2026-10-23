# BUILD.md

## Requirements

- Node.js (current LTS <v24.22.1>) and npm
- Git
- VS Code (version matching engines.vscode in package.json)
- nektos/act CLI for manual testing: https://github.com/nektos/act
- Docker Engine (optional, only for container runners)
- @vscode/vsce for packaging (run through npx)

## Install

```
git clone <repo-url>
cd local-actions-just-like-in-github
npm install
```

## Scripts

Defined in Phase 0 of PLAN.md.

- npm run compile: build extension host and webview once
- npm run watch: rebuild on change
- npm run lint: ESLint
- npm test: unit tests (Vitest)
- npm run test:integration: tests inside VS Code (@vscode/test-electron)
- npm run package: build a .vsix

## Run and debug

1. Open the repository in VS Code.
2. Press F5 and pick the extension launch configuration. An Extension Development Host window opens.
3. In that window open a folder that contains .github/workflows.
4. Run the command: Local Actions: Open Actions Page.
5. After code changes, reload the host window with Ctrl+R (Cmd+R on macOS).
6. Webview debugging: run Developer: Open Webview Developer Tools.

## Package

```
npm run package
```

Produces local-actions-just-like-in-github-<version>.vsix. Install it to test:

```
code --install-extension local-actions-just-like-in-github-<version>.vsix
```

## Release

Only after the user approves the version (see AGENTS.md).

1. Set the version in package.json as X.Y.Z (no leading v).
2. Add a ## vX.Y.Z section to CHANGELOG.md.
3. Run lint, compile and tests.
4. Commit as "Release vX.Y.Z".
5. Create the tag vX.Y.Z.
6. Run npm run package and smoke test the .vsix.
7. Publishing needs the Marketplace publisher filispeen and a personal access token: npx @vscode/vsce publish. Optional Open VSX: npx ovsx publish. Never publish without explicit user approval.

## Troubleshooting

- act not found: install act or set localActions.actPath.
- Container runs fail: start Docker Engine, or use a host runner in Settings.
- Webview is blank: open Webview Developer Tools and check the console and CSP errors.
- Windows: if a run does not stop on cancel, confirm the process tree kill in the runner.
