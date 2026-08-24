# Entangle ArchViz Challenge

A responsive retro-brutalist event website for registration, challenge distribution, private model downloads, design briefs, and submission uploads.

## Event flow

The interface and headline change with the event stage:

1. **Registration — “Design loud. Render honest.”** Participants provide their name, email, phone number, and required confirmations.
2. **Awaiting drop — “Spot secured. Stay ready.”** Registered participants see the synchronized task countdown.
3. **Live challenge — “Model dropped. Make it unforgettable.”** Participants can repeatedly download available model formats, save a design brief, and upload one resumable project archive up to 5 GiB.
4. **Jury review — “Time’s up. Jury’s watching.”** Submissions close and the evaluation state is displayed.

## Backend and email flow

- Supabase stores participants, secure access tokens, design briefs, submission metadata, and private files. Large submission archives upload directly in retryable 6 MiB chunks.
- Registration saves normalized name, email, phone number, consent flags, and timestamps.
- Production registration never returns a participant access token in the public API response; secure access is delivered to the registered mailbox and kept only for the active browser session.
- Resend sends the immediate registration confirmation and completed-upload receipt.
- Each registrant is synchronized to the `Entangle 2K26 — Registered` Resend Segment with a private `access_url`.
- Completed submitters are also synchronized to `Entangle 2K26 — Submitters`.
- Organizers design and schedule task-drop, reminder, and jury-update Broadcasts in the Resend dashboard.

See [SUPABASE_EMAIL_SETUP.md](SUPABASE_EMAIL_SETUP.md) for the production checklist, DNS guidance, SQL setup, Broadcast schedule, and organizer queries.

## Local development

Use Node.js 22 LTS for the smoothest Vercel CLI experience, then install dependencies:

```powershell
npm install
```

Create an ignored `.env.local` file when testing the API locally (never put real values in `.env.example`):

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_ROTATED_SERVER_SECRET
SUPABASE_PUBLISHABLE_KEY=YOUR_SAFE_BROWSER_PUBLISHABLE_KEY
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Entangle 2K26 <events@updates.vkarch.com>
RESEND_REPLY_TO=entangle2k26@vkarch.com
```

The Resend values are optional until email testing is ready. The Supabase publishable key is intentionally safe to send to the browser and is required by signed resumable uploads; the secret key remains server-only. The recommended sending subdomain keeps automated event email separate from the existing office inbox; replies still go to `entangle2k26@vkarch.com`. Never place the Supabase secret or Resend key in browser code or commit them to Git.

Run `npm run dev` to start the local site and API at `http://127.0.0.1:3000`. This repository-owned server loads `.env.local` automatically and does not require a Vercel login. Use `npm run dev:vercel` only when testing Vercel-specific behavior with an authenticated Vercel CLI.

If you use Vercel-managed variables, enable the Supabase values for the **Development** environment as well as Preview and Production. `vercel dev` does not pull Preview or Production values into local development.

Start the full Vercel development server:

```powershell
npm run dev
```

Open the URL printed by Vercel, normally `http://localhost:3000`.

A plain static server can preview the design but cannot run registration, private downloads, Supabase uploads, or other `/api` routes.

## Phase previewing

On localhost, use:

```text
?debug=1&phase=0  Registration
?debug=1&phase=1  Awaiting task drop
?debug=1&phase=2  Live challenge
?debug=1&phase=3  Jury review
```

Preview and Production follow the published dates and cannot be unlocked by the visual debug query.

## Validation

```powershell
npm run check
npm test
npm audit --omit=dev
```

The responsive layout is designed for desktop, tablet, iPhone-sized, and narrow-phone viewports without changing the desktop composition.
