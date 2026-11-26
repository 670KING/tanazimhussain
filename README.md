# Tanazim Hussain — AI Study & Productivity Platform

A full-stack web application that helps students study smarter using AI. It combines
AI chat, a quiz generator, a summarizer, study-plan generation, a document library,
analytics, and a built-in resume builder — all behind a secure authentication system.

**Live project:** https://tanoedu-ai.web.app/

---

## Features

- **AI Chat** — conversational assistant with PDF/image attachments, chart rendering,
  and Markdown + LaTeX math support.
- **Quiz Generator** — turn notes or topics into practice quizzes.
- **Summarizer** — condense long text and documents into concise summaries.
- **Study Plans** — generate structured study schedules.
- **Documents** — upload, store, and manage study materials.
- **Resume Builder** — create and export polished PDF resumes from templates.
- **Analytics & Dashboard** — track activity and progress.
- **Authentication** — secure sign-up / login with per-user data isolation.
- **Responsive UI** with light / dark / system themes.

## Tech Stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend    | Supabase (Postgres, Auth, Storage, Edge Functions)                |
| AI         | OpenRouter (free models) via server-side Edge Functions           |
| PDF        | Client-side HTML-to-PDF generation                                |

## Architecture

```
src/                 React app (pages, components, hooks)
supabase/functions/  Deno Edge Functions (chat, chat-tools) — server-side secrets
supabase/migrations/ Database schema migrations
```

All privileged operations (AI calls, service-role DB access) run inside Supabase Edge
Functions. API keys for OpenRouter and the Supabase service role are stored as
**server-side secrets** and are never shipped to the browser.

## Getting Started

### Prerequisites

- Node.js 18+ (recommend [nvm](https://github.com/nvm-sh/nvm))
- A Supabase project

### Setup

```sh
# 1. Clone
git clone https://github.com/670KING/tanazimhussain.git
cd tanazimhussain

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your Supabase project values in .env

# 4. Start the dev server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values:

- `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  — public browser config (safe to expose).
- `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` — **server-only secrets**,
  set them in Supabase Edge Function secrets, never in `.env` or source control.

## Scripts

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start the dev server              |
| `npm run build`    | Production build                  |
| `npm run preview`  | Preview the production build      |
| `npm run lint`     | Run ESLint                        |

## Security Notes

- `.env` is git-ignored; only `.env.example` is committed.
- The browser only ever receives the public anon/publishable key.
- Service-role and AI keys live exclusively in Edge Function secrets.
- Row-level access keeps each user's data isolated.

## License

See repository for license details.