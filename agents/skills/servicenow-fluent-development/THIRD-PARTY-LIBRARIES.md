# Third-Party Libraries in ServiceNow Fluent React Apps

The ServiceNow Fluent SDK uses **Rollup** (via `@servicenow/isomorphic-rollup`) to bundle client code.
This means standard npm packages work out of the box — you install them, import them, and Rollup
bundles everything into the static assets that the `UiPage` serves.

---

## 1. Dependency Classification

In `package.json`, two categories apply to client-side libraries:

```json
{
  "devDependencies": {
    "@servicenow/sdk": "4.x",
    "@servicenow/isomorphic-rollup": "^1.x",
    "@types/react": "19.x",
    "@types/react-dom": "19.x",
    "@types/some-library": "^1.x"
  },
  "dependencies": {
    "react": "19.x",
    "react-dom": "19.x",
    "some-component-library": "^2.x",
    "some-utility-library": "^1.x"
  }
}
```

| Category | What belongs here |
|---|---|
| `dependencies` | Any library imported in client code — bundled by Rollup into the app |
| `devDependencies` | SDK tooling, type packages (`@types/*`), linters — never bundled |

> **Rule:** If an `import` statement in `src/client/` references it, it goes in `dependencies`.
> Type-only packages (`@types/*`) always go in `devDependencies`.

---

## 2. The Prebuild Script (`now.prebuild.mjs`)

> **Required for React UI Pages:** `now.prebuild.mjs` is **mandatory** for any project that has a React UI page. Without it, `now-sdk build` only type-checks TypeScript — it does **not** bundle the React code. The page will fail to load on the instance.
>
> **`now-sdk init` does NOT create this file.** You must create it manually at the project root before running `now-sdk build` for the first time.

Client code is **not** built by `now-sdk` directly — you must provide a prebuild script.
Create `now.prebuild.mjs` at the project root:

```js
import { servicenowFrontEndPlugins, rollup, glob } from '@servicenow/isomorphic-rollup'

export default async ({ rootDir, config, fs, path, logger, registerExplicitId }) => {
    const clientDir = path.join(rootDir, config.clientDir)

    // Skip if no HTML entry points exist
    const htmlFiles = await glob(path.join(clientDir, '**', '*.html'), { fs })
    if (!htmlFiles.length) {
        logger.warn(`No HTML files found in ${clientDir}, skipping UI build.`)
        return
    }

    const staticContentDir = path.join(rootDir, config.staticContentDir)
    fs.rmSync(staticContentDir, { recursive: true, force: true })

    const rollupBundle = await rollup({
        fs,
        input: path.join(clientDir, '**', '*.html'),
        plugins: servicenowFrontEndPlugins({
            scope: config.scope,
            rootDir: clientDir,
            registerExplicitId,
        }),
        onwarn(warning, warn) {
            // Suppress warnings from specific third-party libraries (see section 5)
            warn(warning)
        },
    })

    const rollupOutput = await rollupBundle.write({
        dir: staticContentDir,
        sourcemap: true,
    })

    rollupOutput.output.forEach((file) => {
        if (file.type === 'chunk') logger.info(`Bundled: ${file.fileName} (${file.code.length} bytes)`)
        if (file.type === 'asset') logger.info(`Asset:   ${file.fileName} (${file.source.length} bytes)`)
    })
}
```

`config.clientDir` and `config.staticContentDir` are resolved from `now.config.json` automatically
by the SDK.

---

## 3. Importing Libraries in Client Code

### Regular TypeScript/JavaScript modules

Import the package exactly as you would in any React project:

```tsx
// src/client/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { SomeProvider } from 'some-library'
import App from './app'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SomeProvider>
            <App />
        </SomeProvider>
    </React.StrictMode>
)
```

### CSS stylesheets

Libraries that ship a CSS file can be imported directly in `.tsx` files —
Rollup will detect the import and include the stylesheet in the bundle:

```tsx
// src/client/app.tsx or src/client/main.tsx
import 'some-library/dist/styles.css'
import 'another-library/style.css'
```

If you use SCSS imports in your own code, declare the module type in `global.d.ts`:

```ts
// src/client/global.d.ts
declare module '*.scss' {
    const content: string
    export default content
}
```

---

## 4. Context Providers

Libraries that expose a React context provider (themes, state managers, etc.) should be
added to `main.tsx`, wrapping `<App />`:

```tsx
// src/client/main.tsx
import { ThemeProvider } from 'some-theme-library'
import { AnotherProvider } from 'another-library'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
        <AnotherProvider config={{ ... }}>
            <App />
        </AnotherProvider>
    </ThemeProvider>
)
```

---

## 5. Suppressing Build Warnings

Some libraries produce Rollup warnings that are expected and harmless.
Handle them in the `onwarn` callback inside `now.prebuild.mjs`:

```js
onwarn(warning, warn) {
    // Libraries that use React Server Components conventions emit this directive.
    // It is irrelevant in a client-only Rollup build and can be safely ignored.
    if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        warning.message.includes('use client')
    ) {
        return
    }

    // Some graph/data-viz libraries (e.g. d3) have intentional circular
    // dependencies that Rollup warns about. Suppress by package name.
    if (
        warning.code === 'CIRCULAR_DEPENDENCY' &&
        warning.message.includes('node_modules/some-library')
    ) {
        return
    }

    // Let all other warnings through
    warn(warning)
},
```

> **Pattern:** Always check `warning.code` first, then narrow by `warning.message` to avoid
> accidentally silencing real issues in your own code.

---

## 6. TypeScript Type Declarations

### Installing types

If a library does not ship its own types, install the corresponding `@types/` package:

```bash
npm install --save-dev @types/some-library
```

### Declaring ServiceNow globals

The `<sdk:now-ux-globals>` tag in `index.html` injects ServiceNow globals at runtime.
Declare them in `src/client/global.d.ts` so TypeScript knows about them:

```ts
// src/client/global.d.ts
declare global {
    interface Window {
        /** CSRF token — send as X-UserToken header on all REST requests */
        g_ck: string
    }

    class GlideAjax {
        constructor(scriptIncludeName: string)
        addParam(name: string, value: string): void
        getXMLAnswer(callback: (response: string) => void): void
        getXML(callback: (response: XMLHttpRequest) => void): void
    }
}
```

### Declaring third-party web components as JSX elements

If a library ships web components (custom HTML elements) and you use them in JSX,
extend the JSX namespace so TypeScript accepts them:

```ts
declare namespace JSX {
    interface IntrinsicElements {
        'my-web-component': React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement> & {
                label?: string
                variant?: 'primary' | 'secondary'
            },
            HTMLElement
        >
    }
}
```

---

## 7. Library Categories and Considerations

| Category | Example | Notes |
|---|---|---|
| Component libraries | UI toolkits with CSS | Import CSS in `main.tsx`; wrap app with provider |
| Icon libraries | SVG icon collections | Usually zero-config; just import and use |
| Data-viz / graph | Canvas/SVG renderers | May need circular dependency warning suppression |
| Syntax highlighting | Code rendering | Import themes/styles alongside components |
| Utility libraries | Date, lodash, etc. | No special steps needed |
| Animation libraries | CSS-in-JS animators | Check for `"use client"` directive warnings |

---

## 8. What Does NOT Work

| Pattern | Why |
|---|---|
| Node.js built-in modules (`fs`, `path`, `crypto`) | Browser bundle — no Node runtime |
| Server-only packages (e.g. `express`, `knex`) | Client bundle only; server logic belongs in `.server.js` |
| Dynamic `require()` | Rollup is ESM-based; use static `import` |
| ServiceNow scoped APIs (`GlideRecord`, `gs`) | Server-side only; expose via GlideAjax ScriptInclude |

---

## 9. Full Checklist

When adding a new third-party library to a Fluent React project:

- [ ] Install with `npm install <package>` (goes in `dependencies`)
- [ ] Install types with `npm install --save-dev @types/<package>` if needed
- [ ] Import the package CSS stylesheet in `main.tsx` or `app.tsx` if it ships one
- [ ] Wrap `<App />` with the library's context provider in `main.tsx` if needed
- [ ] Declare any injected globals or JSX elements in `global.d.ts`
- [ ] Add an `onwarn` suppressor in `now.prebuild.mjs` for known benign warnings
- [ ] Run `now-sdk build` and verify no unexpected errors
- [ ] Run `now-sdk install` and verify the page loads and the library renders correctly
