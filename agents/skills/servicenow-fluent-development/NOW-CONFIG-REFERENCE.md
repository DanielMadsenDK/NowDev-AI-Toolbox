# now.config.json Reference

`now.config.json` is the project configuration file for a Fluent SDK application. It lives at the project root and defines scope metadata, source directories, build output, dependencies, runtime policies, and transform behavior. It does not store instance credentials; authentication is managed by `now-sdk auth` or CI environment variables.

## Required Properties

| Property | Notes |
|---|---|
| `scope` | Application scope. Pattern: `x_...`, `sn_...`, or `global`. Max length 18. |
| `scopeId` | 32-character sys_id for the application scope, or `global`. |

Most projects also include `name` and `tsconfigPath`.

```json
{
  "scope": "x_my_app",
  "scopeId": "26571502d0a642339adf60a7edf6fab9",
  "name": "My App",
  "tsconfigPath": "./src/server/tsconfig.json"
}
```

## Common Properties

| Property | Default | Purpose |
|---|---|---|
| `fluentDir` | `src/fluent` | Directory containing `.now.ts` Fluent files. |
| `generatedDir` | `generated` | Directory under `fluentDir` for generated files such as `keys.ts`. |
| `serverModulesDir` | `src/server` | Directory containing server modules built into `sys_module`. |
| `clientDir` | `src/client` | Directory containing client app files. Set empty to disable client build. |
| `metadataDir` | `metadata` | Directory containing downloaded or transformed XML metadata. |
| `appOutputDir` | `dist/app` | Build output for app metadata. |
| `packOutputDir` | `target` | ZIP/package output directory. |
| `staticContentDir` | `dist/static` | Static asset output. |
| `defaultLanguage` | `en` | BCP 47 language for table/column documentation defaults. |
| `tableOutputFormat` | `bootstrap` | Table artifact output style: `bootstrap` or `component`. |
| `jsLevel` | `es_latest` | JavaScript level for the application. |
| `trustedModules` | `[]` | NPM package names or organization prefixes trusted as internal module sources. |

`tableDefaultLanguage` is deprecated; use `defaultLanguage`.

## Dependencies

Declare cross-scope dependencies directly by scope. The deprecated `dependencies.applications` shape should not be used for new work.

```json
{
  "dependencies": {
    "global": {
      "roles": ["itil"],
      "tables": ["incident", "sys_user"]
    },
    "sn_customerservice": {
      "tables": "*"
    }
  }
}
```

## Runtime And Policy Settings

- `applicationRuntimePolicy`: `none`, `tracking`, or `enforcing`.
- `accessControls`: controls Studio visibility, privacy, runtime access tracking, scoped administration, uninstall behavior, and user role.
- `performancePolicy`: resource limits for API, event handler, interactive transaction, and scheduled job quotas.
- `wildcardPolicy`: application resource limit exemptions for network, record, and scripting pillars.
- `licensing`: subscription and license model metadata.

## Transform And Build Customization

- `excludeFilePatterns`: basenames to discard during transform.
- `ignoreTransformTableList`: tables ignored during transform.
- `taxonomy`: table-to-folder mapping for generated files.
- `modulePaths`: map imported file paths to runtime module paths when custom TypeScript output differs from source layout.
- `serverModulesIncludePatterns` and `serverModulesExcludePatterns`: control which server module files are built.
- `scripts`: async SDK task runner hooks such as `prebuild`.
- `staticContentPaths`: mapping of source files to static output paths.