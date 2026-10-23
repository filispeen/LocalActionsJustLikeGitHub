# PLAN.md

Goal: a VS Code extension that does what GitHub Local Actions does (run workflows, jobs and events locally via nektos/act, history, settings) but with its main UI as a GitHub Actions-style page.

Reference (architecture only): https://github.com/SanjulaGanepola/github-local-actions. It has Components, Workflows, History and Settings views, and runs act commands as VS Code tasks. This project differs by parsing act output into structured runs and rendering them in a webview page.

## Scope

In scope for v1:
- Discover workflows in .github/workflows
- Run a whole workflow, a single job, or an event
- Actions page: workflow sidebar, run list, run summary, job graph, steps, logs
- Run history persisted per workspace
- Settings: secrets, variables, inputs, runners, payloads, options
- Components status: act and Docker

Out of scope for v1:
- GitHub API integration (importing remote variables, remote runs)
- Editing workflows, pushing, authoring marketplace actions

## Architecture

- Extension host: workflow discovery, ActRunner, RunStore, settings, commands, tree views.
- Webview: React app talking to the host through a typed message protocol defined in src/shared.
- Actions page styling: @primer/css (MIT) bundled locally to match the look of the GitHub Actions page. A saved copy of the GitHub page is a local visual reference only (reference/ folder, git-ignored, never shipped). See AGENTS.md.
- ActRunner spawns act as a child process (not a VS Code task) so output can be parsed. Arguments are an array. Cancel kills the whole process tree, including on Windows.
- Output parsing: check whether the installed act supports structured JSON output; if so prefer it, otherwise parse the text format. Decide from real captured output, not assumptions. Record findings in this file under Phase 3 notes.
- RunStore: an index file plus one log file per run in workspace storage. Retention limit is a setting (default 50 runs).
- Run status model: queued, in_progress, success, failure, cancelled, skipped.

## Phase 0: Scaffold

- [x] git init, .gitignore, .vscodeignore, both excluding the local reference/ folder
- [x] package.json with name local-actions-just-like-in-github, displayName "Local Actions, Just Like In GitHub", publisher filispeen, initial version 0.1.0, a recent stable engines.vscode
- [x] tsconfig (strict), ESLint flat config, esbuild scripts for host and webview, scripts from BUILD.md
- [x] Activation entry and one command: Local Actions: Open Actions Page
- [x] F5 launch configuration and tasks
- [x] README skeleton and CHANGELOG.md with v0.1.0
- [x] Ask the user about the license before adding LICENSE

Done when: F5 opens the Extension Development Host and the command opens an empty webview.

## Phase 1: Components

- [x] Detect act (PATH and setting localActions.actPath) and read its version
- [x] Detect Docker (daemon reachable)
- [x] Components view showing act and Docker status with install guidance and a refresh action
- [x] Never install anything without explicit user confirmation

Done when: the view correctly reports installed, missing and not running states.

## Phase 2: Workflow discovery

- [x] Find .github/workflows/*.yml and *.yaml in every workspace folder, watch for changes
- [x] Parse name, events (string, array and map forms of on), jobs, needs, runs-on, matrix presence, workflow_dispatch inputs
- [x] Tolerate invalid YAML and surface the error in the UI
- [x] Workflows tree view with Run and Open File actions
- [x] Unit tests with fixture workflows

Done when: tree matches the files on disk and updates live.

## Phase 3: Runner and store

- [x] Build act argv from workflow, job, event, payload, secrets, variables, inputs, platform mapping and extra options (verify each flag against act --help)
- [x] Spawn with cwd = workspace folder, stream output
- [x] Parse output into run, jobs, steps with status, timings and log lines
- [x] Cancel with process tree kill
- [x] RunStore persistence, retention, secret redaction
- [x] Event emitter so views and webview get live updates
- [x] Unit tests for the parser using captured real output fixtures

Phase 3 notes: Tested against act v0.2.89. The --json flag outputs newline-delimited JSON with jobID, job (<workflow>/<job>), step name, stepID, raw_output for stdout lines, executionTime in nanoseconds, stepResult and jobResult ('success'/'failure'), and ISO timestamps. Plain text logs prefix lines with [<workflow>/<job>] and emoji/status markers (e.g. ⭐ Run, |, ✅ Success, ❌ Failure, 🏁 Job succeeded/failed). On Windows, process tree cancellation requires taskkill /pid <pid> /T /F to avoid orphan runner processes.

Done when: a real workflow run produces a stored run with correct job and step statuses.

## Phase 4: Actions page, shell and run list

- [x] WebviewPanel with CSP and nonce, typed protocol, state restore, VS Code theme variables
- [x] Install @primer/css and bundle it locally in the webview (no CDN)
- [x] GitHub Actions tab layout, matching the real page: left sidebar (All workflows plus each workflow), header, run list rows
- [x] Row content: status icon, run title, workflow name, event, branch, duration, relative time
- [x] Filters: workflow, event, status
- [x] Live updates for in-progress runs
- [x] Run workflow button wired to the Phase 6 flow (stub until then)

Done when: runs appear live and filters work.

## Phase 5: Run detail

- [x] Summary: trigger, status, total duration
- [x] Job list and a job dependency graph from needs
- [x] Job view: collapsible steps with status and duration
- [x] Logs: ANSI colors, auto-scroll while running, search, copy, timestamp toggle, virtualized for large logs
- [x] Actions: cancel, re-run all, re-run failed jobs, delete run, save logs to file

Done when: a finished run can be inspected step by step like on GitHub.

## Phase 6: Run dialog

- [x] Pick workflow, optional job, event
- [x] Form generated from workflow_dispatch inputs
- [x] JSON payload editor with validation
- [x] Runner/platform override
- [x] Same flow from page button, tree context menu and command palette

Done when: all run modes from the reference feature list work (all workflows, one workflow, one job, event, workflow event, job event).

## Phase 7: Settings

- [x] Secrets via SecretStorage
- [x] Variables, inputs, runners (including host system runner), payloads, options (cache, artifacts, containers)
- [x] Persist per workspace, wire into the runner
- [x] Redaction verified by test

Done when: settings change the executed act command as expected.

## Phase 8: Polish and release

- [x] Empty and error states: act missing, Docker not running, no workflows, invalid workflow
- [x] Keyboard navigation and aria labels
- [x] Integration tests with @vscode/test-electron
- [x] Original icon, README with screenshots, CHANGELOG up to date
- [x] npm run package produces a .vsix that installs and passes a smoke test
- [x] Ask the user before any publishing

## Risks

- act output format differs between versions: record the tested version in README.
- Windows: path handling and process tree kill.
- Large logs: virtualize rendering and cap stored size.
- No Docker: host runner path must still work.
- Webview memory: do not retain context when hidden, restore from state.
