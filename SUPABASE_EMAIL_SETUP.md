# Entangle launch setup

The site uses Supabase for registrations and private files. Resend sends two instant transactional emails and provides the visual editor/scheduler for organizer broadcasts.

## Event schedule (India Standard Time)

| Event | Time |
| --- | --- |
| Registration opens | 31 August 2026, 12:00 AM |
| Registration closes / task drops | 3 September 2026, 11:59 PM |
| 24-hour reminder | 6 September 2026, 11:59 PM |
| One-hour reminder | 7 September 2026, 10:59 PM |
| Submission deadline | 7 September 2026, 11:59 PM |
| Jury thank-you broadcast | 10 September 2026, 12:00 PM |

The website dates are fixed in `api/_lib/event.js`. The four broadcast times are configured in Resend, not in Vercel code.

## 1. Security first

The screenshots shared during setup exposed a Supabase secret and mailbox credentials. Treat both as compromised:

1. Create a new Supabase secret key and revoke the exposed one.
2. Ask IT to change the mailbox password.
3. Never place either secret in browser JavaScript, Git, screenshots, or chat.

The Supabase publishable key is not needed by this implementation.

Production registration does not return secure participant tokens to the browser response. Existing registrations cannot be overwritten through the public form; refreshed access is delivered only to the already-saved mailbox. Browser access tokens use session storage and disappear when the browser session closes.

## 2. Supabase database and buckets

Run the complete contents of `supabase/migrations/202608220001_event_backend.sql` in **Supabase → SQL Editor**. If you already ran the original setup SQL, run the small follow-up files `supabase/migrations/202608230002_resend_sync_audit.sql`, `supabase/migrations/202608230003_resumable_5gb_submissions.sql`, and `supabase/migrations/202608240004_security_hardening.sql` once as well. They are safe to rerun. Confirm these private buckets exist:

- `challenge-assets`
- `challenge-submissions`

Inside `challenge-assets`, create a `models` folder and upload any or all of these formats:

- `.fbx`
- `.obj`
- `.glb`

The app prefers the final filenames shown on the website, but during setup it will use the first matching extension. Therefore `models/test.obj` is valid for testing. Replace it with the final model before launch. Do not make either bucket public.

## 3. Minimal Vercel variables

Add the two Supabase values to **Development**, **Preview**, and **Production**. Add Resend to those same environments only after IT gives you a real API key:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
RESEND_API_KEY
```

For now, omit `RESEND_API_KEY` completely. Do not save placeholder text as the value. Registration, database storage, model downloads, briefs, and submission uploads will still work; emails and Resend contact syncing will be skipped. Add the real key and redeploy after IT completes the domain setup.

`vercel dev` reads the **Development** scope. After changing that scope, stop the local server, run `npx vercel@latest pull --yes`, and start `npm run dev` again. The generated `.env.local` and `.vercel` files are intentionally ignored by Git.

No `CRON_SECRET`, model-path, email-content, date, or upload-size variables are required.

The security-hardening migration adds server-side rate limits for registration, participant lookup, downloads, briefs, and submissions. If it has not been applied, the server logs a warning and temporarily fails open so the launch is not broken.

## 3.1 Submission storage sizing

The application allows **one resumable archive up to 5 GiB per participant**. This is not a shared 5 GiB allowance. Total project storage and download bandwidth are separate Supabase plan quotas, so size the Supabase plan for the expected participant count.

The browser uploads directly to Supabase using signed TUS resumable uploads in fixed 6 MiB chunks. Interrupted transfers retry automatically and can resume from the previously uploaded chunks.

Because the bucket inherits the project-wide Storage limit, open **Supabase → Storage → Settings** and set **Global file size limit** to at least **5 GB** before testing. Keep `challenge-submissions` private and leave its per-bucket file-size restriction disabled; the API enforces the 5 GiB participant limit.

## 4. Resend and the office mailbox

1. Add `vkarch.com` as a sending domain in Resend.
2. Ask IT to add the exact SPF, DKIM, and return-path records shown by Resend at the authoritative DNS provider (likely Cloudflare).
3. Keep the existing root-domain MX records used by Netrix. Do not replace them and do not enable Resend Receiving on the root domain.
4. After Resend shows **Verified**, create a **Full access** API key, add it to Vercel as `RESEND_API_KEY`, and redeploy. Full access is required because the backend both sends emails and creates/updates Contacts, Segments, and the `access_url` contact property. Keep this key server-only.

The sender and reply address are fixed as `Entangle 2K26 <entangle2k26@vkarch.com>`. Resend handles outgoing delivery; replies and website questions continue to arrive in the existing Netrix inbox. Multiple DNS records can coexist when they have distinct names/purposes; IT should copy Resend's values exactly and preserve the office-mail MX records.

Treat participant archives as untrusted files. Download them only on an organizer machine with current endpoint protection, scan every archive before extraction, extract into a dedicated folder, and never run submitted executables outside a disposable sandbox or virtual machine.

The Resend test domain is suitable only for sending to the account owner's address. A verified `vkarch.com` domain is required before sending to all participants.

## 5. Which emails live where

The application sends these automatically at the event action:

- Registration confirmation: immediately after a successful registration.
- Submission receipt: immediately after a completed archive upload.

The application also keeps Resend contacts organized automatically:

- `Entangle 2K26 — Registered`: every registered participant.
- `Entangle 2K26 — Submitters`: participants whose upload completed.
- `access_url`: each participant's private challenge link, stored as a custom contact property.

Every successful registration first saves the participant's normalized name, email, phone number, consent flags, and timestamps in Supabase. If Resend is configured, that same request creates or updates a Resend Contact using the participant email and adds it to the Registered segment. Supabase records `resend_contact_id`, `resend_synced_at`, or `resend_sync_error`, so recipient syncing can be audited without guessing.

After the API key is added, the first registration creates the segments automatically. In **Resend → Broadcasts**, use the visual editor to create and schedule:

1. Task drop → Registered segment → 3 September, 11:59 PM IST.
2. 24-hour reminder → Registered segment → 6 September, 11:59 PM IST.
3. One-hour reminder → Registered segment → 7 September, 10:59 PM IST.
4. Thank-you / jury review update → Submitters segment → 10 September, 12:00 PM IST.

For the task-drop and reminder buttons, use `{{{contact.access_url}}}` as the URL so each recipient gets their own secure challenge link. The thank-you Broadcast can use the ordinary production website URL. Before scheduling, send each Broadcast as a test to yourself and verify the link and timezone shown by Resend.

## 6. Test now without Resend

Use local `vercel dev` for early end-to-end testing. Preview and Production correctly keep model and submission APIs locked until the real event dates.

1. Make sure the two Supabase variables are enabled for Development, pull them locally, and restart `npm run dev`.
2. Register with a test address. The page should say the registration was saved without email delivery.
3. The secure participant token is stored in that browser automatically.
4. Open the same localhost URL with `?debug=1&phase=2`.
5. Click OBJ download. `models/test.obj` should download.
6. Test a design brief and a ZIP submission. The upload should display percentage progress and continue through transient connection failures.
7. Confirm rows in `participants` and `submissions`, and files in `challenge-submissions`.

When Resend is ready, add its key, redeploy, and register with a new email address to test the instant confirmation and automatic segment creation.

## Organizer queries

```sql
-- Registration count
select count(*) from participants;

-- Completed submissions with participant contact details
select p.name, p.email, p.phone, s.original_filename, s.storage_path, s.uploaded_at
from submissions s
join participants p on p.id = s.participant_id
where s.status = 'uploaded'
order by s.uploaded_at;

-- Failed instant emails to investigate
select p.email, e.email_type, e.error, e.attempted_at
from email_deliveries e
join participants p on p.id = e.participant_id
where e.status = 'failed'
order by e.attempted_at desc;

-- Participants whose Resend recipient sync needs attention
select name, email, phone, resend_contact_id, resend_synced_at, resend_sync_error
from participants
where resend_synced_at is null or resend_sync_error is not null
order by registered_at desc;
```

Download participant archives from the private `challenge-submissions` bucket in the Supabase dashboard.
