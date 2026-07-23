---
name: nowdev-ai-toolbox-servicenow-sdk
user-invocable: false
description: Canonical reference for running the now-sdk CLI directly — covers explain (SDK/API documentation lookup), query (live instance data), and every other subcommand (auth, init, download, build, install, dependencies, transform, clean, pack). Use whenever an agent needs to invoke now-sdk, verify a Fluent SDK API shape, look up live instance data (sys_ids, table schema, roles, scopes, choices, ACLs), or run a build/deploy command. For NowDev-specific routing and project conventions, use nowdev-ai-toolbox-fluent-development instead.
---

# now-sdk CLI Reference

This skill is the **sole authority** for `now-sdk` command construction, subcommand and flag discovery, authentication-alias handling, output envelopes, pagination, error classification, secret handling, and mutation approval. Every agent or skill that invokes `now-sdk` must load this skill first and follow its current guidance. Other resources may own the business purpose, tables, fields, encoded-query intent, evidence requirements, interpretation, and documentation topic IDs, but must not duplicate complete commands or prescribe flags.

This skill does **not** own NowDev routing, agent handoffs, domain workflows, or the meaning of retrieved evidence — use the relevant domain skill and `nowdev-ai-toolbox-fluent-development` for those concerns.

`now-sdk` is a real CLI tool, already installed. Call it directly — never wrap it in `npx` and never assume it must be installed first.

## Resolving the command

Enterprise environments frequently disable `npx` so IT retains control over what executes on developer machines. This skill exists so agents respect that: `now-sdk` is called directly, from an existing install, every time.

If `now-sdk` isn't recognized when called directly, check in this order before telling the user anything is missing:

1. `now-sdk --version` — global install, already on PATH.
2. `./node_modules/.bin/now-sdk` (POSIX) or `.\node_modules\.bin\now-sdk.cmd` (Windows) — local project install.
3. In a workspace/monorepo layout, the binary may live under a nested package's own `node_modules/.bin` rather than the repo root — check there too if the above don't resolve.

If none of these resolve it, **stop and tell the user** the SDK isn't installed or isn't resolvable from this location. Never fall back to `npx`, `npm exec`, `pnpm dlx`, or a global install command to "make it work" — that silently reintroduces the exact behavior this skill exists to avoid, and may violate the environment's install policy. If the user explicitly asks how to install `now-sdk`, you may describe the appropriate install method for their environment (e.g. `npm install -g now-sdk` or a workspace-local install), but do not run the install command yourself without explicit user confirmation. The no-fallback rule applies to autonomous invocation, not to user-directed installation guidance.

## Getting oriented

Before invoking any subcommand for the first time in a conversation, run `now-sdk --help` to enumerate available subcommands. You do not need to repeat this if you have already done so earlier in the same conversation:

```bash
now-sdk --help
```

This lists every subcommand but **does not** show subcommand flags. Before using any subcommand for the first time — or any time you're unsure of its current flags — run its `--help` first:

```bash
now-sdk <subcommand> --help
```

Never guess a flag name. Flags differ per subcommand and guessing produces silent errors or wrong results.

## Documentation lookup (`explain`)

`now-sdk explain` displays installed SDK documentation for a topic and runs entirely offline against the locally installed SDK — no network call, no proxy concerns. Never open a full topic before previewing it — full topics can be long and burn context for no reason.

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

`query` is **read-only** — it never mutates instance data regardless of flags. Read-only access can still expose sensitive or excessive data, so query only what the task requires. User approval is not normally required for a bounded, relevant query against an unambiguous target instance, but stop for clarification when the target, purpose, authorization, or data sensitivity is unclear.

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

**Keep every exploratory query small by default.** Instance tables can hold millions of rows; an unbounded query dumped into context wastes tokens and can silently exceed limits.
- Default to a small `--limit` (start around 10–25 rows) unless the user has explicitly asked for a full export or count.
- Use `-f`/`--fields` to request only the columns you actually need — don't pull every column on a table to read one value.
- If you need a total count rather than the rows themselves, check whether a count-only mode exists via `now-sdk query --help` before pulling full rows just to count them.

**Be deliberate about which instance you're hitting.** If more than one auth alias is configured, always pass `-a`/`--auth <alias>` explicitly — never rely on an unstated default. If it's ambiguous which instance the user means (e.g. dev vs. test vs. prod), ask before querying, since the result will inform a decision.

**Be careful with what the result contains.** Some tables can return personally identifiable information, credentials, or other sensitive data (e.g. user records, HR cases, discovery credentials). Don't paste large sets of raw sensitive rows into a chat response — summarize, aggregate, or redact instead, and only show verbatim rows the user specifically asked to see.

Use metadata-first discovery when the schema is uncertain: establish the table and field contract before reading business records. Never retrieve credential values, secrets, tokens, password fields, encryption material, or unrestricted journal content. For records containing PII, journals, email bodies, logs, HR/security data, or production identifiers, request only the minimum fields and rows, redact before reporting, and explain any residual sensitivity.

Treat command output as an envelope, not just rows. Check command success, warnings, truncation, pagination/count metadata, and parseability before drawing conclusions. If the requested evidence spans more rows than one bounded response, paginate deliberately and record the coverage; never silently treat the first page as a complete population.

- Other flags worth knowing exist (confirm exact names with `now-sdk query --help` before use): `--offset`, `--display-value`, `--no-count`, `--timeout`, `--view`, `--query-category`, `--query-no-domain`.
- If `query` isn't recognized, don't jump straight to a version conclusion — first rule out a connectivity problem (see "Troubleshooting: connectivity vs. installation" below), since `query` needs to reach the instance and `explain` does not.

## Other commands

Every row below needs its own `--help` before use — this table is for orientation, not a flag reference.

| Command | Purpose |
|---|---|
| `now-sdk auth` | Inspect or configure instance credential aliases. Never request, echo, log, or route passwords, tokens, or other secrets through model-mediated input. |
| `now-sdk init` | Scaffold a new Fluent app, apply a template, or convert a legacy scoped app into Fluent source. |
| `now-sdk download <directory>` | Download application metadata from an instance into a local directory. |
| `now-sdk build [source]` | Compile Fluent sources into app files and generate an installable package. |
| `now-sdk install` | Install or update the application on an instance. |
| `now-sdk dependencies [sysIds..]` | Download configured dependencies and TypeScript type definitions, or register new dependency items. |
| `now-sdk transform` | Download and convert XML records (from instance or a local path) into Fluent source code. |
| `now-sdk clean [source]` | Clean the build output directory. |
| `now-sdk pack [source]` | Zip a built app into an installable artifact. |

## Safety and approval

Classify the intended operation before execution:

| Operation class | Examples | Approval rule |
|---|---|---|
| Local read-only | Help, version, installed documentation | May run when relevant. |
| Instance read-only | Bounded live queries, alias listing | May run when the target and authorization are clear; apply data-minimization rules. |
| Local workspace mutation | Init, download, dependencies, transform, clean, pack, generated output | Requires an explicit user request for the task and normal workspace change safeguards. |
| Instance mutation | Install or update | Requires explicit target-instance confirmation and user approval immediately before execution. |
| Destructive or credential mutation | Reinstall, alias creation/change/deletion | Requires explicit approval for the exact action; never collect secrets through chat or model-mediated terminal input. |

In particular, never run either of these without explicit user confirmation:

- `now-sdk install --reinstall` / `-r` uninstalls and reinstalls the app on the instance; any instance-only metadata not present locally is lost.
- `now-sdk auth --delete` removes a stored credential alias.

`query`, `explain`, and their `--list`/`--peek` variants never write to anything and don't need this level of caution.

## Troubleshooting: connectivity vs. installation

`explain` runs entirely offline against the locally installed SDK, so a failure there is always a resolution or version problem — never a network problem.

`query`, `auth`, `install`, `download`, and `dependencies` all need to reach the ServiceNow instance itself. When one of these fails, distinguish the cause before concluding anything:

- **Command not recognized at all** (shell reports "command not found" or similar) — a resolution problem. See "Resolving the command" above.
- **Command is recognized but the call fails, times out, or returns an auth/connection error** — a connectivity or credentials problem, not a version problem. This is common in environments with a corporate proxy or SSL inspection — exactly the kind of environment that also disables `npx`. Don't assume the SDK is outdated in this case; check the alias with `now-sdk auth --list` and ask the user to confirm network access to the instance before troubleshooting further.

Report failures using one of these categories so callers can respond consistently: command resolution, unsupported command/flag, authentication, authorization, connectivity/TLS/proxy, invalid query or schema, timeout, output parse failure, or partial/truncated result. Include the failed operation and sanitized error text, but never include credentials, tokens, cookies, or sensitive row data.

## If a command or flag isn't recognized

Run `now-sdk --version` and inform the user their installed `now-sdk` may be too old for the feature in question. Do not hardcode or trust a specific "minimum version" number from memory — SDK releases move faster than this file is updated. Verify behavior empirically with `--help` and `--version` instead.