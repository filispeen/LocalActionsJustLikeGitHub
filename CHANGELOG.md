# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## v0.2.1

- Style RunDialog with native GitHub Actions modal and form classes (`gh-dialog`, `gh-field`, `gh-textarea`).
- Remove redundant Primer CSS bundle dependency in webview index.
- Enable code minification in esbuild configuration for production builds.
- Exclude zip and vsix archive files from packaged extension distribution.
- Reduce extension VSIX distribution size by more than 50% down to 113 KB.

## v0.2.0

- Redesign Actions page with authentic GitHub Actions styles and layout.
- Add dedicated GitHub Actions stylesheet (`gh.css`) with dark theme variables and canvas styling.
- Number and format log lines with line-level hover highlighting and search filtering in StepsViewer.
- Add per-workflow incremental run numbering (`#1`, `#2`, etc.).
- Introduce run metadata grid showing trigger origin, branch badges, commit SHA, duration, and run timestamps.
- Redesign JobGraph with dotted canvas background and interactive job node pills.
- Refine Octicon-style SVG status icons for queued, in_progress, success, failure, skipped, and cancelled states.

## v0.1.16

- Parse declared steps from workflow YAML and initialize job steps in exact declaration sequence.
- Preserve all log lines across step partitions without dropping lines after step success or failure.
- Transition unexecuted queued steps to skipped status on failure, matching GitHub Actions behavior.
- Add raw log view toggle in the steps log viewer.
- Reconstruct step structures from log output for runs with empty stored steps.
- Add skipped step status icon styling.

## v0.1.15

- Queue stdout and stderr line processing in ActRunner sequentially to preserve log line ordering.
- Add write mutex queue and atomic temporary file writes for index.json in RunStore.
- Format step start, step finish, and job finish events into explicit markers in JSON output mode.
- Remove duplicate secret redaction call between ActRunner and RunStore.
- Buffer openRunDialog requests in ActionsPanel until webview ready event is received.
- Pass secret values through process environment variables instead of plaintext CLI arguments.
- Eliminate duplicate saveRun invocation and redundant message posting from extension update listener.
- Expand host runner platform mapping across all standard labels and workflow job configurations.
- Update rerunFailedJobs to re-execute all failed jobs and preserve original execution parameters.
- Restrict workflow file discovery to root .github/workflows directory and exclude node_modules and .git.
- Isolate secrets in SecretStorage per workspace using workspace URI prefixes.
- Construct absolute default path for log file export dialog.
- Terminate all active runner process trees on extension deactivation and await store initialization.
- Cache log chunks and streaming lines in App state to eliminate UI flicker when switching runs.
- Partition step logs per step and cap rendering at 2000 lines with Primer close button styling in dialog.

## v0.1.0

- Actions page webview matching GitHub Actions layout with Primer CSS styling.
- Left workflow sidebar, live run list, and filter toolbar (search, event, status).
- Run detail view with interactive job dependency graph (DAG) derived from `needs`.
- Collapsible per-job execution steps with durations and real-time streaming status.
- Rich log viewer with ANSI terminal colors, search, copy button, and auto-scroll.
- Run dialog supporting dynamic `workflow_dispatch` input forms, JSON payload editor, and runner overrides.
- Components tree view detecting act CLI version and Docker Engine reachability with install guidance.
- Workflows tree view with automatic discovery of `.github/workflows`, live file watching, and error tolerance.
- Settings tree view and secure SecretStorage integration with automated log redaction.
- Robust process management with full process tree termination on Windows and POSIX.
