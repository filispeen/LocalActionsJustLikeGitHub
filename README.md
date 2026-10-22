# Local Actions, Just Like GitHub

Run GitHub Actions workflows locally through the `nektos/act` CLI with a familiar GitHub Actions interface inside VS Code.

## Features

- **Actions Page**: Dedicated interface with workflow sidebar, run list, run summary, job graph, and collapsible step logs.
- **Local Runner**: Spawns `nektos/act` directly against your repository workflows.
- **Workflow Discovery**: Automatically detects workflows in `.github/workflows`.
- **Run History**: Retains local execution history across workspace sessions.
- **Settings & Secrets**: Configure inputs, environment variables, and runner platforms.

## Requirements

- [nektos/act](https://github.com/nektos/act)
- Docker Engine (optional, required only for container-based runners)

## Extension Settings

This extension contributes the following settings:

* `localActions.actPath`: Path to the `act` CLI executable (defaults to `act` in PATH).

## Usage

1. Open a workspace containing GitHub Actions workflows in `.github/workflows`.
2. Run the command **Local Actions: Open Actions Page** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

## License

Apache-2.0
