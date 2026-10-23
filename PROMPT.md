Build a VS Code extension named "Local Actions, Just Like In GitHub".

It runs GitHub Actions workflows locally through the nektos/act CLI and shows runs in a dedicated page that looks and behaves like the GitHub Actions tab: workflow sidebar, run list, run summary with job graph, per-job steps with collapsible logs.

Reference for architecture only: https://github.com/SanjulaGanepola/github-local-actions (Apache-2.0). Do not copy its code, assets or text.

Start by reading AGENTS.md, PLAN.md and BUILD.md in the repository root. They are the source of truth for rules, scope, phases and commands.

Then:
1. Execute PLAN.md phase by phase, in order.
2. Check each task box in PLAN.md when it is done.
3. Verify act behavior against the installed act version and real output. Do not assume flags or log formats.
4. After each completed set of changes, run lint, compile and tests, then commit as required by AGENTS.md.
5. If a version bump looks needed, stop and ask me before changing any version.
6. If a decision is ambiguous or irreversible (license, publishing, dependency swap), ask me instead of guessing.

Begin with Phase 0.
