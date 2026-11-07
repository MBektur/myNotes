# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Notes/kanban/calendar/schedule app (Uyghur UI, RTL). Data lives in **Supabase** (Postgres + Storage + Auth); schema in `supabase/migrations/0001_init.sql`, env vars in `.env.example`. Browser-only client (`lib/supabase/client.ts`), no server client/proxy: access is protected by RLS. Notes sync = optimistic reducer + snapshot diff in `lib/notes-store.tsx` (+ realtime); schedule in `lib/schedule-store.ts`; workspaces (üst kategori, notes.workspace_id; migration `0003_workspaces.sql`) in `lib/workspaces-store.ts`; attachments in `lib/blobs.ts` (Storage, IndexedDB as cache). Push reminders: account-wide deadline reminders (`0005_reminders.sql`, `due.ts`) plus per-note alarms in `notes.reminders` (`0006_note_reminders.sql`); both sent by `supabase/functions/send-reminders` via pg_cron. The occurrence logic in `supabase/functions/send-reminders/occurrence.ts` is shared with the client, so it must stay import-free. UI prefs (view/sort/filters) stay in localStorage. No test runner.

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
