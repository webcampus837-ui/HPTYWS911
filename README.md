# HBTYWS911 🎁

A personalized birthday-surprise platform. As the admin you create a private
surprise page for someone you love — a locked landing page, a heartfelt
message, a gallery of photos, confetti and a chime — and share a single link.
The page unlocks **only** when the birthday person enters their own date of
birth. No accounts for visitors, nothing to install, nothing exposed before
the date check passes.

---

## 1. Features

**Admin side (private)**
- Email + password sign-in powered by Supabase Auth (no public registration).
- Dashboard with live stats: total / active / inactive birthdays and total photos.
- Birthday list with search, status and theme filters, sortable columns, and
  mobile card layout.
- Full CRUD: create, edit, enable/disable (without deleting), and delete
  (database row + every photo in Supabase Storage — nothing orphaned).
- Photo uploader: multi-file, drag-and-drop, client-side downscale to WEBP,
  reorder, delete, 8 MB / JPG-PNG-WEBP limits.
- 60+ original visual themes across 11 categories, with live swatches rendered
  by the real theme engine and a full-screen preview modal.
- 12 preset birthday messages + optional fully custom message.
- One-click copy of the public link, plus an in-dashboard preview of the real
  four-step experience.

**Public side (visitor-facing)**
- A locked landing page: first name + theme only — no DOB, no photos, no
  message before the date check.
- The visitor's date of birth is the only access code. Wrong answers get one
  generic response ("Hmm... that's not it 😄 Try again!") — never a hint.
- After unlocking: reveal → message → photos → finale, with confetti and a
  soft chime (respecting reduced-motion preferences).
- Every public page is `noindex, nofollow` and its title shows a first name
  at most ("A Special Surprise for Suhail 🎁").

## 2. Tech stack

| Layer      | Choice                                            |
|------------|---------------------------------------------------|
| Frontend   | React 18 + TypeScript (strict) + Vite 5           |
| Styling    | Tailwind CSS 3 + a hand-rolled theme engine       |
| Routing    | React Router v6 (route-level code splitting)      |
| Backend    | Supabase (PostgreSQL + Auth + Storage) — no custom server |
| Hosting    | Vercel (SPA rewrites + immutable asset caching)   |

There is deliberately **no separate backend server**: all reads/writes go
through Supabase with Row Level Security, and the only anonymous entry points
are two audited `SECURITY DEFINER` RPCs.

## 3. Project structure

```
├── index.html                  # App shell (public surface)
├── public/                     # favicon
├── src/
│   ├── main.tsx                # Bootstrap (router + toasts + auth)
│   ├── App.tsx                 # Route table
│   ├── index.css               # Tailwind + hand-rolled components
│   ├── components/
│   │   ├── admin/              # Dashboard, forms, tables, modals, pickers
│   │   ├── experience/         # The four-step birthday experience
│   │   ├── theme/              # Theme engine (ThemedStage, particles)
│   │   └── ui/                 # EmptyState, RouteFallback
│   ├── data/presetMessages.ts  # The 12 preset messages (editable in code)
│   ├── hooks/                  # useAuth, useToast, useChime, useDocumentMeta…
│   ├── lib/                    # Supabase client, friendly errors, image prep
│   ├── pages/                  # Home, Birthday, NotFound, admin pages
│   ├── services/               # birthdays / photos / public RPC wrappers
│   ├── themes/                 # 60+ theme definitions + registry
│   ├── types/                  # Shared TypeScript contracts
│   └── utils/                  # slug, message, date helpers
├── supabase/schema.sql         # Tables, RLS, RPCs, storage bucket
└── vercel.json                 # SPA rewrites + cache headers
```

## 4. Prerequisites

- Node.js **18+** (Node 20 LTS recommended) and npm.
- A free [Supabase](https://supabase.com) project.
- A [Vercel](https://vercel.com) account (or any static host that supports SPA
  rewrites) for deployment.

## 5. Local setup

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see §6)
npm run dev                 # http://localhost:5173
```

Other scripts:

```bash
npm run build       # type-check + production build to dist/
npm run preview     # serve the production build locally
npm run typecheck   # tsc --noEmit only
```

## 6. Supabase setup

1. Create a project at [supabase.com](https://supabase.com) → **New project**.
2. Open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. The script is
   idempotent and prints no errors when re-run.
3. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
4. Paste both into `.env` (local) and into **Project → Settings → Environment
   Variables** (Vercel).

> ⚠️ Never use the `service_role` key in this app. The anon key is all the
> frontend needs: RLS and the two RPCs enforce every rule server-side.

### Locking down Auth (important)

The app has **no registration page**, so nobody should be able to create
accounts except you:

1. **Authentication → Providers → Email**: enable it.
2. **Authentication → Sign In / Providers**: turn **OFF** "Allow new users to
   sign up".
3. **Authentication → Users → Add user → Create new user**: enter the admin
   email and a strong password. This is the only account that can reach
   `/admin`.

RLS makes the `authenticated` role the hard boundary: even if someone obtained
the anon key, they still cannot read birthday data without logging in as your
admin account.

## 7. Database schema (summary)

`supabase/schema.sql` is the source of truth; in short:

- **`birthdays`** — `id, name, slug (unique, format-checked, reserved words
  rejected), date_of_birth, theme_id, preset_message_id, custom_message,
  status ('active'|'inactive'), created_at, updated_at`.
- **`birthday_photos`** — `id, birthday_id → birthdays ON DELETE CASCADE,
  storage_path (unique), public_url, display_order, created_at`.
- **`unlock_attempts`** — server-only rate-limit state (8 failures in 10 min →
  10-minute lock per slug). No client can read it.
- **RLS** — tables are invisible to `anon`; `authenticated` (your admin login)
  has full access. No policies exist for `unlock_attempts` at all.
- **RPCs** — `get_birthday_teaser(slug)` returns `{status, first_name,
  theme_id}` only; `unlock_birthday(slug, dob)` compares the DOB inside the
  database and returns the full payload **only on an exact match**. Wrong
  guesses always return the same `{status:'invalid'}` — no close/correct
  hints — and are throttled.
- **Storage** — a public `birthday-photos` bucket (8 MB limit, JPEG/PNG/WEBP
  only) with `SELECT` public, `INSERT`/`DELETE` restricted to
  `authenticated`.

## 8. Deployment (Vercel)

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repository. Vercel
   auto-detects Vite — no build settings need changing.
3. Add the two environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) in **Project → Settings → Environment Variables**.
4. Deploy.

`vercel.json` already contains the SPA rewrite (`/* → /index.html`) so deep
links like `/suhail` work, plus long-cache headers for hashed assets.

**Using your own domain:** the admin dashboard copies the public link using
the *current browser origin*, so it automatically uses
`https://hbtyws911.vercel.app` (or your custom domain) with nothing to
hard-code. Add the domain in **Project → Settings → Domains**.

## 9. Environment variables

| Variable               | Where it lives        | Purpose                        |
|------------------------|-----------------------|--------------------------------|
| `VITE_SUPABASE_URL`    | `.env` + Vercel       | Your Supabase project URL      |
| `VITE_SUPABASE_ANON_KEY` | `.env` + Vercel     | Public anon key (safe for browser) |

`.env` is git-ignored — never commit it. There are no other secrets; the
service-role key is intentionally unused by this project.

## 10. Security notes

- **DOB never leaves the database unverified.** Public traffic only calls the
  two RPCs; the DOB column is never selected into any public result. Wrong
  guesses get a single generic answer and are rate-limited server-side.
- **No metadata leaks.** Public pages are `noindex, nofollow`; titles show a
  first name at most; inactive pages return a neutral "currently unavailable"
  with no private details.
- **Admin surface is fully protected.** Unauthenticated visits to `/admin`
  redirect to `/admin/login`; the session is Supabase Auth; RLS is the
  enforcement layer, not just the UI.
- **Storage is cleaned up.** Deleting a birthday removes every photo object
  first and then the row (photos cascade); a failed storage delete is reported
  in the admin toast so nothing silently orphans.
- **Errors are friendly.** Raw database/PostgREST errors are mapped to
  human-readable messages everywhere a user can see them.

## 11. Customization

- **Preset messages** — edit `src/data/presetMessages.ts` (each entry has an
  `id`, a `label` and `text` with a `{name}` placeholder).
- **Themes** — `src/themes/registry.ts` + `src/themes/definitions/`. A theme
  is a plain object (colors, fonts, particle + gradient style); add one and it
  automatically appears in the picker, previews and experience.
- **Upload limits** — `MAX_UPLOAD_BYTES` in `src/lib/images.ts` (keep it in
  sync with the bucket limit in `supabase/schema.sql`).
- **Brand** — the logo lives in `src/components/ui/Brand.tsx`; the palette in
  `tailwind.config.js`.

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| "This site is still being set up" on a birthday page | `schema.sql` has not been run, or `.env` is missing/wrong. Check the SQL editor history and the env values. |
| Login fails with "Invalid login credentials" | Create the user in **Authentication → Users** and confirm email provider is enabled. |
| Anyone can sign up from the login page | Disable "Allow new users to sign up" in Auth settings (the app renders no sign-up UI, but lock the provider too). |
| Photos upload but the row insert fails | The uploaded file is rolled back automatically; check that `birthday_photos` RLS allows `authenticated` (re-run `schema.sql`). |
| Public link 404s after refresh on Vercel | Ensure `vercel.json` was committed and redeploy. |
| Dashboard shows a generic error on every action | The anon key is wrong or RLS policies are missing — re-run `schema.sql`. |

---

Built with React, TypeScript, Tailwind CSS, Supabase and Vercel.
All themes are original artwork — no third-party characters, logos or branded
artwork are used anywhere in this project.
