# Tasks

> **UI redesign (2026-11):** Modern, calm dark interface with soft indigo accent, refined spacing, elevated surfaces, and clearer visual hierarchy. All features and data logic remain unchanged.
>
> **Responsive polish (2026-11):** Mobile-first touch targets (≥44px), safer iOS keyboard / safe-area handling, no auto-zoom on inputs, wider layout on large screens, and tighter spacing on small phones.

A to-do list built with React + Tailwind CSS (user-facing name **Tasks**, technical name `task`). Tasks are grouped by date. A completed task is not deleted; it stays on its own day, struck through and faded. Today and later days appear in the main list, grouped by week (Monday to Sunday, with the week number, date range and done/total); past days are hidden behind a small **History** button (a bottom sheet on phones, a side panel on wide screens). Inside, only days that have tasks are listed, newest to oldest, split by month; the newest day starts open and the others are a single line (day and completed/total). For anything older than 30 days there is an "Older days" button. A time can optionally be added to any task (the **Time** button in the add bar). Tapping a task opens it; **Edit** opens a dialog where you can change its name, description, subtasks, day and time, or delete it. Subtasks can be ticked straight from the opened task. Data is stored in the browser; if you like, sign in with Google to back it up to Supabase and sync across devices. GitHub Actions publishes the site to GitHub Pages on every `main` update.

### Language (English / Turkish)

The interface is available in **English** and **Türkçe**. Use the **EN | TR** switch at the top right of the page. The first time, the browser language decides (Turkish browsers start in Turkish, everything else in English); after that the choice is remembered in this browser (`task-lang-v1`). Everything follows the language: all texts and labels, dates and month/weekday names (Turkish reads "18 Ekim Pazar"), repeat descriptions, messages, error messages and the page title. Quick add understands both languages in either interface language: `yarın`, `bugün` and `saat 14:30` work just like `tomorrow`, `today` and `at 14:30`.

Texts live in one place, `src/lib/i18n.js` (an `en` and a `tr` dictionary). To add a text, add the same key to both; `npm test` fails if the two dictionaries differ or if the code uses a key that does not exist. Task data is never translated, so switching the language does not touch your tasks or the backup. The installed-app (PWA) name in `vite.config.js` is fixed at build time and stays "Tasks".

### Usage tips

- **Description and subtasks:** add them while creating a task with the **Details** button in the add bar (for a repeating task every occurrence starts with them), or later in **Edit**. A task with a description or subtasks shows small icons (and `done/total` for subtasks) in its row.
- **Quick add:** you can type `tomorrow`, `today` (Turkish: `yarın`, `bugün`) and a time like `14:30` in the title; e.g. `tomorrow 14:30 report` → "report", tomorrow, 14:30. Only a day word at the start/end and an `HH:MM` time are recognised.
- **Overdue:** unfinished tasks from earlier days appear at the very top of the main list; **Move all to today** brings them to today in one tap (can be cancelled with Undo).
- **Recurring task:** use the **Repeat** button in the add bar and mark the weekdays you want (Mon…Sun). A repeat can run **Forever**, or you can choose **A set number** and enter how many times it repeats (e.g. 10 times); when the number is reached the repeat ends by itself ("Ended" shows in the Recurring list). Occurrences are only added and shown for the **next 14 days**; later dates are created automatically when their day comes up (repeats do not show on days further ahead). If the chosen date is in the future, the repeat does not appear until that date. Every occurrence is an ordinary task (it can be completed, moved, deleted). From the **Recurring** button under the list, or from **Edit repeat** in an occurrence's edit dialog, you can change the name, time and days; the change applies to unfinished occurrences after today, while past and completed ones stay as they are. Deleting a repeat also deletes the unfinished occurrences after today.
- **Undo:** a deleted task can be restored from the message that appears at the bottom.
- **Keyboard:** `n` or `/` jumps to the new-task field.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and anon key (the same in all three apps)
npm run dev                  # http://localhost:5173
npm test                     # date and merge logic tests
```

The app also works without Supabase keys. In that case cloud backup is off and tasks are stored only in the browser.

### Supabase backup setup (once, shared by the three apps)

Daily, Flow and Tasks use **the same Supabase project and the same single table** (`app_backups`). Each app writes to its own row in the table (`app` column: `daily`, `flow`, `task`), so data never gets mixed up. Each user sees only their own rows (RLS).

1. **Table:** paste the contents of `supabase/setup.sql` into Supabase → SQL Editor and run it (running it again is safe).
2. **Google sign-in:** turn on **Google** in Supabase → Authentication → Providers and enter the Client ID and Client Secret of your OAuth client in Google Cloud. In Google Cloud, add the address Supabase shows, `https://<project>.supabase.co/auth/v1/callback`, to that client's **Authorized redirect URIs**.
3. **Redirect URLs:** add the addresses of the three apps (with a trailing `/`) to Supabase → Authentication → URL Configuration → **Redirect URLs**, plus `http://localhost:5173/` for local development. Example: `https://oguzbatuhan.github.io/daily/`, `https://oguzbatuhan.github.io/flow/`, `https://oguzbatuhan.github.io/task/`.
4. **Keys:** get the `Project URL` and the `anon public` key from Supabase → Project Settings → API. Put them in `.env.local` locally, and in the repo's **Settings → Secrets and variables → Actions → Variables** for the published site, as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The key is designed to be public; RLS protects the data. **Never** use the `service_role` key.

If you created the table under a different name, give its name with `VITE_SUPABASE_TABLE`.

### How sync works

- Tasks and recurring-task rules are written to the shared `app_backups` table in Supabase as the `app = task` row (older backups have no rules, which is fine); the Daily and Flow rows are never touched. Sign-in is with Google.
- Descriptions and subtasks are part of the backup. If the same task changed on two devices, the most recent change wins for its own fields (name, day, time, description, done), but **subtasks are merged one by one**: ticking a subtask on the phone and adding another on the laptop keeps both. Deleted tasks and removed subtasks stay marked as deleted for 30 days, so the deletion reaches other devices too.
- A recurring task that a device creates by itself for today never overwrites edits another device already made to that day.
- The upload is guarded: if another device saved while this one was merging, nothing is overwritten; the app downloads the newer copy, merges again and retries.
- The Supabase library is only downloaded when cloud backup is in use.
- Sync runs one second after a task changes and when you return to the tab.
- The **Disconnect** button only ends the session in this browser. The backup in Supabase stays.
- The session is persistent on the phone/browser and refreshes itself in the background. If the session drops, a **Reconnect** button appears at the top.
