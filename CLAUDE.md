# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Freshly scaffolded `create-next-app` project (app name `my-app`, folder `myNotes`). `app/page.tsx` is still the default template; no notes functionality, data layer, or tests exist yet. Not a git repository.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm start        # serve production build
npm run lint     # eslint (flat config: eslint.config.mjs)
```

No test runner is configured.

## Stack and gotchas

- Next.js 16.4.5, React 19.3.0, Tailwind CSS v4, TypeScript, App Router (`app/` at repo root, no `src/`).
- **This Next.js version has breaking changes versus common training data** (see [AGENTS.md](AGENTS.md)). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices. The AGENTS.md block is auto-written by `next dev`; leave it in place.
- [next.config.ts](next.config.ts) enables `cacheComponents` and `partialPrefetching`, which change caching/rendering semantics for pages and data fetching. Check the docs for these before adding data fetching or dynamic APIs.
- Tailwind is wired through Turbopack: `next.config.ts` has a `turbopack.rules` entry running `@tailwindcss/turbopack` on `*.css`, rather than the usual PostCSS config. Styles live in `app/globals.css`.
