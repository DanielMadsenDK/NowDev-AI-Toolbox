---
name: nowdev-ai-toolbox-servicenow-sdk
context: fork
user-invocable: false
description: Canonical reference for running the now-sdk CLI directly — covers explain (SDK/API documentation lookup), query (live instance data), and every other subcommand (auth, init, download, build, install, dependencies, transform, clean, pack). Use whenever an agent needs to invoke now-sdk, verify a Fluent SDK API shape, look up live instance data (sys_ids, table schema, roles, scopes, choices, ACLs), or run a build/deploy command. For NowDev-specific routing and project conventions, use servicenow-fluent-development instead.
last_verified: "2026-07-01"
---

# now-sdk CLI Reference

This skill owns `now-sdk` CLI command syntax and flag discipline. It does **not** own NowDev routing, agent handoffs, or workflow conventions — use `servicenow-fluent-development` for those.

`now-sdk` is a real CLI tool, already installed. Call it directly — never wrap it in `npx` and never assume it must be installed first.

## Getting oriented

The first time in a session you need `now-sdk`, run:

```bash
now-sdk --help
```

This lists every subcommand but **does not** show subcommand flags. Before using any subcommand for the first time — or any time you're unsure of its current flags — run its `--help` first:

```bash
now-sdk <subcommand> --help
```

Never guess a flag name. Flags differ per subcommand and guessing produces silent errors or wrong results.

## Documentation lookup (`explain`)

`now-sdk explain` displays installed SDK documentation for a topic. Never open a full topic before previewing it — full topics can be long and burn context for no reason.

Discovery sequence:

```bash
now-sdk explain --list <keyword> --format raw     # search for topics
now-sdk explain <topic> --peek --format raw        # preview one match
now-sdk explain <topic> --format raw               # read in full, only once confirmed relevant
```

Always pass `--format raw` — it returns plain markdown for you to parse, versus `--format pretty` (the default) which is for a human terminal.

Topics span several categories: metadata/API reference (`table-api`, `businessrule-api`, `scriptinclude-api`, `aiagent-api`, ...), workflow guides (`business-rule-guide`, `ci-integration`, `alias-guide`, ...), and quickstart topics (`developing-apps-guide`, `fluent-overview`, `module-guide`). Run `now-sdk explain --list` with no keyword to browse everything.

Troubleshooting:
- `No documentation found for "<topic>"` — wrong topic name, retry with `--list <keyword>`.
- `No match for "<topic>"` — try a different search term.
- `explain` (or a flag you expect) isn't recognized at all — run `now-sdk --version` and tell the user their installed SDK is likely too old for this feature. Don't invent a workaround.

## Live instance queries (`query`)

```bash
now-sdk query <table> -q '<encoded-query>' -o json
```

- `-q` / `--query` (encoded query string, e.g. `active=true^priority<=2`) is required.
- Always add `-o json` when you (the agent) need to parse the result — it's the machine-readable envelope, versus the default human-readable table.
- Before writing a non-trivial encoded query, read the reference topics:

```bash
now-sdk explain query --format raw
now-sdk explain encoded-query-guide --format raw
```

- Other flags worth knowing exist (confirm exact names with `now-sdk query --help` before use): `--limit`, `--offset`, `-f`/`--fields`, `--display-value`, `--no-count`, `--timeout`, `--view`, `--query-category`, `--query-no-domain`, `-a`/`--auth` (named credential alias).
- If `query` isn't recognized, same version-check guidance as `explain` above.

## Other commands

Every row below needs its own `--help` before use — this table is for orientation, not a flag reference.

| Command | Purpose |
|---|---|
| `now-sdk auth` | Configure instance credentials: `--add`, `--delete`, `--list`, `--use`. Supports piping a password via stdin for non-interactive use. |
| `now-sdk init` | Scaffold a new Fluent app, apply a template, or convert a legacy scoped app into Fluent source. |
| `now-sdk download <directory>` | Download application metadata from an instance into a local directory. |
| `now-sdk build [source]` | Compile Fluent sources into app files and generate an installable package. |
| `now-sdk install` | Install or update the application on an instance. |
| `now-sdk dependencies [sysIds..]` | Download configured dependencies and TypeScript type definitions, or register new dependency items. |
| `now-sdk transform` | Download and convert XML records (from instance or a local path) into Fluent source code. |
| `now-sdk clean [source]` | Clean the build output directory. |
| `now-sdk pack [source]` | Zip a built app into an installable artifact. |

## Safety notes

Two commands in this CLI have irreversible or credential-affecting side effects — never run either without explicit user confirmation:

- `now-sdk install --reinstall` / `-r` uninstalls and reinstalls the app on the instance; any instance-only metadata not present locally is lost.
- `now-sdk auth --delete` removes a stored credential alias.

## If a command or flag isn't recognized

Run `now-sdk --version` and inform the user their installed `now-sdk` may be too old for the feature in question. Do not hardcode or trust a specific "minimum version" number from memory — SDK releases move faster than this file is updated. Verify behavior empirically with `--help` and `--version` instead.
