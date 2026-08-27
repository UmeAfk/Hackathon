# Entangle production launch runbook

This runbook configures automated event email with Resend and large private submissions with Supabase without disturbing the existing `vkarch.com` office-mail system.

Last reviewed: **25 August 2026** against the live Resend configuration, public DNS, the current application, and the official Resend, Cloudflare, Supabase, and Vercel documentation.

## The safe architecture

| Purpose | Service / address |
| --- | --- |
| Domain registrar | GoDaddy |
| Authoritative DNS | Cloudflare |
| Existing office inbox and incoming mail | Keep the current Netrix/SpamExperts-backed setup unchanged |
| Automated sending domain | `vkarch.com` in Resend; `send.vkarch.com` is the return-path hostname |
| Automated From address | `Entangle 2K26 <entangle2k26@vkarch.com>` |
| Human Reply-To inbox | `entangle2k26@vkarch.com` on the existing office mail system |
| Registration and metadata | Private Supabase database tables |
| Challenge model and candidate archives | Private Supabase Storage buckets |

Resend verifies the root domain, but its SPF and bounce-routing records live at the separate `send.vkarch.com` hostname. The existing root MX and root SPF records remain dedicated to office mail.

## Public DNS state checked on 25 August 2026

The current public records confirm:

- `vkarch.com` uses Cloudflare nameservers: `adi.ns.cloudflare.com` and `hayes.ns.cloudflare.com`.
- Root mail is routed through the existing SpamExperts MX records at priorities 10, 20, and 30.
- The root SPF record is `v=spf1 a:vkarch.com ip4:188.40.22.54 include:spf.antispamcloud.com -all`.
- `_dmarc.vkarch.com` is present in monitoring mode with `v=DMARC1; p=none;`.
- `resend._domainkey.vkarch.com` is present and Resend reports DKIM as verified.
- `send.vkarch.com` MX points to Resend's Amazon SES feedback host and Resend reports it as verified.
- The required `send.vkarch.com` SPF TXT record does not currently resolve publicly and must still be added.

This means Cloudflare is the place where new DNS records must be added. GoDaddy remains the registrar; **do not change the GoDaddy nameservers**.

## Event schedule

Resend may display a local timezone or accept a UTC timestamp. Confirm every scheduled item in both IST and UTC before queueing it.

| Event | India time (Asia/Kolkata) | UTC |
| --- | --- | --- |
| Registration opens | 31 Aug 2026, 11:00 AM IST | 31 Aug 2026, 05:30 UTC |
| Registration closes / task drops | 4 Sep 2026, 11:59 AM IST | 4 Sep 2026, 06:29 UTC |
| 24-hour reminder | 8 Sep 2026, 11:59 AM IST | 8 Sep 2026, 06:29 UTC |
| One-hour reminder | 9 Sep 2026, 10:59 AM IST | 9 Sep 2026, 05:29 UTC |
| Submission deadline | 9 Sep 2026, 11:59 AM IST | 9 Sep 2026, 06:29 UTC |
| Jury thank-you broadcast | 10 Sep 2026, 12:00 PM IST | 10 Sep 2026, 06:30 UTC |

The website defaults are in `api/_lib/event.js` and can be overridden with the `ENTANGLE_*` Vercel environment variables documented in `.env.example`. Scheduled Broadcasts are configured separately in Resend; changing a website date does not automatically reschedule an existing Broadcast.

When a deadline changes:

1. Update `ENTANGLE_SUBMISSION_DEADLINE_AT` in Vercel using an ISO 8601 value with the India offset, for example `2026-09-11T11:59:00+05:30`.
2. Redeploy Production so the website and newly generated email content use the new date.
3. In Resend → Broadcasts, cancel or edit every scheduled reminder affected by the change, update its content, and schedule it again at the intended IST time.
4. Send a new test email and verify both the displayed deadline and Resend's scheduled time before queueing.

## 1. Change boundary for office IT

Give this section to the office IT team before touching DNS.

### Do not change or delete

- GoDaddy nameservers or domain-registration settings.
- Any `@` / `vkarch.com` MX record.
- The existing root SPF TXT record.
- Existing DKIM selectors, mail host records, autodiscover, webmail, SRV, verification, or antispam records.
- The office mailbox provider, mail passwords, forwarding, or normal employee mail clients.
- Cloudflare proxy settings for existing records.

### Only add

The remaining approved record is:

- `send.vkarch.com` TXT with `v=spf1 include:amazonses.com ~all` — Resend SPF for the dedicated return-path hostname.

The `send.vkarch.com` MX, `resend._domainkey.vkarch.com` DKIM TXT, and `_dmarc.vkarch.com` monitoring record are already present. Do not duplicate them.

Before the change, export or screenshot the complete Cloudflare DNS zone. After the change, compare it and verify that the only differences are the approved new subdomain records.

## 2. Complete Resend domain authentication

The `vkarch.com` domain is already verified in Resend and Sending is enabled. Do not enable Receiving/Inbound.

In **Cloudflare → vkarch.com → DNS → Records**, add the missing SPF TXT record. Use **DNS only** and TTL **Auto**:

| Resend full name | Cloudflare Name | Type | Notes |
| --- | --- | --- | --- |
| `send.vkarch.com` | `send` | TXT | `v=spf1 include:amazonses.com ~all` |

Do **not** add another SPF TXT record at `vkarch.com` and do not append Resend to the current root SPF. A domain must not publish two competing SPF records at the same hostname. The separate `send.vkarch.com` SPF does not conflict with the existing `vkarch.com` SPF.

The MX at `send.vkarch.com` is a return-path record for outgoing Resend mail. It is not a replacement for the root MX records and does not route employee inbox mail to Resend.

### DMARC

The public root DMARC record is currently in safe monitoring mode (`p=none`). It affects every sender using the domain and should remain owned by office IT.

Safe rollout:

1. First verify that existing office email passes its current SPF and DKIM checks.
2. Ask IT to review Resend's suggested DMARC record.
3. Start in monitoring mode (`p=none`) and send aggregate reports to an inbox IT actually monitors.
4. Do not move to `quarantine` or `reject` until IT has reviewed reports from every existing mail source.

Never create multiple DMARC records at the same name. IT should review aggregate reports before changing the policy to `quarantine` or `reject`.

### Verify without risking office mail

1. After the `send` TXT record resolves, re-verify that Resend marks SPF and DKIM as **Verified**.
2. Send a test from `entangle2k26@vkarch.com` to:
   - the existing `entangle2k26@vkarch.com` Netrix inbox;
   - one external Gmail test inbox;
   - one external Outlook test inbox.
3. Inspect the delivered headers and confirm `spf=pass`, `dkim=pass`, and `dmarc=pass` when DMARC is present.
4. Reply to the message and confirm the reply reaches `entangle2k26@vkarch.com`.
5. Send a normal employee-to-employee office email and an external-to-office email. Both must continue through the existing office mail system.

## 3. Resend API and Vercel configuration

The backend sends transactional email and also creates Contacts, Segments, and the `access_url` contact property. Because those audience operations are not permitted by a sending-only key, this implementation needs a **Full access** Resend API key.

Create a Full-access key named `Entangle website full access`, copy it once, and store it only in local development and Vercel server variables. Rotate it after the event.

Set these in **Vercel → Project → Settings → Environment Variables → Production**:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SERVER_SECRET
SUPABASE_PUBLISHABLE_KEY=YOUR_SAFE_BROWSER_PUBLISHABLE_KEY
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Entangle 2K26 <entangle2k26@vkarch.com>
RESEND_REPLY_TO=entangle2k26@vkarch.com
```

Then redeploy Production. The From domain must exactly match the verified Resend domain, including the subdomain.

### Keep production data separate

- Production Vercel must point only to the production Supabase project.
- Preview and local development should use a separate staging Supabase project.
- Omit `RESEND_API_KEY` from Preview unless a separate staging Resend key/domain is available.
- Never point an unrestricted Preview deployment at production registration or submission data.
- Never commit `.env.local`, a Supabase secret key, Resend key, database password, or mailbox password.

The Supabase variable must be a server-side secret key (`sb_secret_...`) or legacy service-role key. Do not use a publishable/anon key here, and do not use the database password.

## 4. What the application sends automatically

Transactional emails happen in direct response to participant actions:

- Registration confirmation immediately after successful registration.
- Submission receipt immediately after the archive is verified as uploaded.

The application also maintains:

- `Entangle 2K26 — Registered` segment.
- `Entangle 2K26 — Submitters` segment.
- `access_url` custom Contact property containing each participant's secure link.

Registration is saved in Supabase before email is attempted. Resend results are audited in `email_deliveries`, and contact-sync failures are stored in `participants.resend_sync_error`.

### Resend plan sizing

The current Resend Free plan allows 100 transactional emails per day and 3,000 per month, plus Broadcasts to at most 1,000 marketing contacts. Upgrade before launch if registration confirmations plus submission confirmations could exceed 100 in a day or if more than 1,000 candidates are expected.

After the first controlled test registration, confirm that both Segments and the `access_url` property exist. Doing this before public launch prevents concurrent first registrations from racing to create the same resources.

## 5. Create and schedule participant Broadcasts

In **Resend → Broadcasts**, create four drafts with this sender:

```text
Entangle 2K26 <entangle2k26@vkarch.com>
```

| Broadcast | Segment | Schedule |
| --- | --- | --- |
| Task drop | Registered | 4 Sep 2026, 11:59 AM IST / 06:29 UTC |
| 24-hour reminder | Registered | 8 Sep 2026, 11:59 AM IST / 06:29 UTC |
| One-hour reminder | Registered | 9 Sep 2026, 10:59 AM IST / 05:29 UTC |
| Thank-you / jury update | Submitters | 10 Sep 2026, 12:00 PM IST / 06:30 UTC |

Use the following exact personalization syntax in the button URL for task-drop and reminder emails:

```text
{{{contact.access_url}}}
```

Useful copy placeholder:

```text
Hi {{{contact.first_name|there}}},
```

Send every draft as a test to an organizer first. Verify the personalized link, mobile rendering, sender, Reply-To behavior, segment, and displayed schedule before queueing it.

Do not schedule the Broadcast until a test Contact has a non-empty `access_url`. Immediately after scheduling, open the queued item again and confirm its UTC time.

## 6. Supabase database and private buckets

Run the migrations in filename order:

1. `supabase/migrations/202608220001_event_backend.sql`
2. `supabase/migrations/202608230002_resend_sync_audit.sql`
3. `supabase/migrations/202608230003_resumable_5gb_submissions.sql`
4. `supabase/migrations/202608240004_security_hardening.sql`
5. `supabase/migrations/202608240005_enforce_submission_bucket_limit.sql`
6. `supabase/migrations/202608240006_signed_resumable_submission_policy.sql`
7. `supabase/migrations/202608260007_unique_participant_phone.sql`

Run them through a controlled Supabase migration workflow or paste one complete file at a time into **Supabase → SQL Editor**. Keep the results with the launch record.

The final state must contain two **private** buckets:

- `challenge-assets`
- `challenge-submissions`

Upload the final challenge PDF inside `challenge-assets/brief/` with this exact path:

- `brief/Entangle_2K26_Challenge_Brief_v1.pdf`

Keep the bucket private. The website creates a short-lived download URL only after it verifies the participant's challenge link. Replacing the PDF while keeping the same filename updates what future downloads receive; for clearer version history, change `v1` to `v2` in both Storage and the website allow-list.

Upload the final model files inside `challenge-assets/models/` using the website filenames:

- `ArchViz_Base_Building_v1.0.fbx`
- `ArchViz_Base_Building_v1.0.obj`
- `ArchViz_Base_Building_v1.0.glb`

Do not make either bucket public and do not add public `storage.objects` policies. The backend issues short-lived signed URLs only after validating a participant token and the event window.

### Storage limits

1. Open **Supabase → Storage → Settings**.
2. Set **Global file size limit** to at least **6 GB**. The application allows 5 GiB (5,368,709,120 bytes); 6 GB avoids dashboard decimal/binary ambiguity.
3. Confirm `challenge-submissions` has the exact bucket limit **5,368,709,120 bytes (5 GiB)** after the migrations.
4. Leave MIME-type restrictions disabled because browsers report archive MIME types inconsistently. The API validates extensions and stores files at server-generated paths.
5. Keep the bucket private.

Supabase Pro supports a much higher configured file limit, and resumable uploads support files up to 50 GB. This application intentionally caps each participant at 5 GiB.

### The implemented large-upload flow

The current code correctly uses:

- a private bucket;
- one server-generated object path per pending submission;
- server-side participant, phase, extension, file-size, and AI-disclosure validation;
- a signed Supabase upload token;
- the direct `PROJECT_REF.storage.supabase.co` TUS endpoint;
- the required fixed 6 MiB TUS chunk size;
- retry delays and browser upload fingerprints for resume;
- `x-upsert: false` to prevent accidental overwrite;
- one completed submission per registered participant;
- object existence and stored-size verification before marking the row uploaded.

Supabase signed upload URLs are valid for two hours. A created TUS upload URL can remain valid for up to 24 hours. Run a real 5 GiB test from the slowest representative connection; 5 GiB in two hours needs roughly 6 Mbps sustained upload throughput after overhead.

## 7. Capacity and cost planning

The worst-case storage requirement is candidate count multiplied by 5 GiB, plus challenge assets and operational headroom.

| Candidates | Maximum candidate archives |
| ---: | ---: |
| 25 | 125 GiB |
| 50 | 250 GiB |
| 100 | 500 GiB |
| 200 | 1,000 GiB |

Supabase Pro currently includes 100 GB of Storage and 250 GB of egress for the organization; usage above included quotas is billed when overages are allowed. Storage is billed by GB-hour, so a short event costs less than retaining all archives for a full month, but organizer downloads also consume egress.

In **Supabase Organization → Billing → Cost Control**:

1. Confirm the project is on Pro.
2. Decide with the budget owner whether to turn the Spend Cap off. With it on, services can be restricted after quota/grace-period handling; with it off, overages continue and are billed.
3. Monitor Storage Size, egress, and the Upcoming Invoice during the event.
4. Record who is authorized to change billing controls.

Do not wait for launch day to make this decision.

## 8. Read-only Supabase verification queries

Run these after all migrations:

```sql
-- Required tables and RLS state
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'participants', 'participant_tokens', 'submissions',
    'email_deliveries', 'api_rate_limits'
  )
order by tablename;

-- Both buckets must be private; submissions must show 5368709120
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('challenge-assets', 'challenge-submissions')
order by id;

-- Public roles should not have table privileges
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'participants', 'participant_tokens', 'submissions',
    'email_deliveries', 'api_rate_limits'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Rate-limit function should exist
select to_regprocedure(
  'public.consume_api_rate_limit(text,text,integer,integer)'
) as rate_limit_function;

-- Actual object count and bytes by bucket (bigint is required above 2 GiB)
select bucket_id,
       count(*) as object_count,
       coalesce(sum((metadata->>'size')::bigint), 0) as total_bytes
from storage.objects
where bucket_id in ('challenge-assets', 'challenge-submissions')
group by bucket_id
order by bucket_id;
```

Expected results:

- Five required tables with `rowsecurity = true`.
- Both buckets with `public = false`.
- `challenge-submissions.file_size_limit = 5368709120`.
- No privilege rows for `anon` or `authenticated`.
- A non-null rate-limit function.

## 9. End-to-end launch test

Use a staging Supabase project first. Then perform one controlled production test before registration opens.

1. Register a fresh test candidate.
2. Confirm the `participants` row, token row, successful registration email, Resend Contact, Registered segment membership, and populated `access_url`.
3. Follow the secure link from the email in a fresh browser session.
4. Confirm all three model downloads work and return private signed URLs.
5. Save a design brief.
6. Upload and complete:
   - a small archive;
   - an archive larger than 6 MiB;
   - a large representative UE5 archive;
   - one full 5 GiB boundary test if operationally possible.
7. During a large upload, disconnect the network briefly and confirm it resumes.
8. Refresh/reopen the page during an interrupted upload and confirm the TUS fingerprint can resume it.
9. Confirm the final `submissions` row has `status = 'uploaded'`, the expected byte count, `uploaded_at`, and `receipt_sent_at`.
10. Confirm the Contact is added to Submitters and receives one receipt only.
11. Attempt a second completed submission and confirm it is rejected.
12. Verify Preview/Production cannot bypass event dates with query parameters.
13. Check Vercel function logs, Supabase API/Storage logs, and Resend delivery status for failures or rate limits.

## 10. Back up candidate archives

Supabase Pro database backups do **not** include Storage objects, and Supabase Storage does not provide S3 object versioning. A deleted archive cannot be restored through a database backup.

After submissions close:

1. Freeze organizer access and do not delete or rename objects.
2. Export the completed-submission manifest from the query below.
3. Enable Supabase's S3-compatible access for a designated organizer and copy `challenge-submissions` to encrypted office-controlled storage using an S3 client such as rclone, AWS CLI, or Cyberduck.
4. Generate SHA-256 hashes for the copied archives and compare counts and total bytes with Supabase.
5. Keep at least two controlled copies until judging and dispute periods finish.
6. Revoke the temporary S3 credentials after the backup is verified.

Creating S3 credentials is a privileged action. Limit it to the smallest number of trusted organizers and save it in the office password manager, never in this repository.

## 11. Organizer queries

```sql
-- Registration count
select count(*) from participants;

-- Completed-submission manifest
select p.name,
       p.email,
       p.phone,
       s.id as submission_id,
       s.original_filename,
       s.storage_path,
       s.file_size,
       s.uploaded_at
from submissions s
join participants p on p.id = s.participant_id
where s.status = 'uploaded'
order by s.uploaded_at;

-- Incomplete uploads to investigate before judging
select p.name, p.email, s.id, s.original_filename, s.file_size,
       s.status, s.updated_at
from submissions s
join participants p on p.id = s.participant_id
where s.status <> 'uploaded'
order by s.updated_at;

-- Failed instant emails
select p.email, e.email_type, e.error, e.attempted_at
from email_deliveries e
join participants p on p.id = e.participant_id
where e.status = 'failed'
order by e.attempted_at desc;

-- Resend Contacts needing attention
select name, email, phone, resend_contact_id,
       resend_synced_at, resend_sync_error
from participants
where resend_synced_at is null or resend_sync_error is not null
order by registered_at desc;
```

## 12. Final go-live checklist

- [ ] Office IT approved the additive `send.vkarch.com` SPF TXT record without changing the root SPF or MX records.
- [ ] GoDaddy nameservers and all existing office-mail records are unchanged.
- [ ] Resend SPF and DKIM show Verified.
- [ ] Office, Gmail, and Outlook tests pass; replies reach the Netrix inbox.
- [ ] Production Vercel uses the production Supabase project only.
- [ ] All migrations ran and the verification queries match expected results.
- [ ] Global Storage limit is at least 6 GB; submissions bucket is private and capped at 5 GiB.
- [ ] Supabase Pro spend-cap decision and monitoring owner are documented.
- [ ] Resend plan supports the expected daily registrations and Contact count.
- [ ] A realistic large upload resumed successfully.
- [ ] Registered and Submitters segments contain the correct test Contact.
- [ ] All four Broadcasts were test-sent, personalized, and scheduled at the checked UTC times.
- [ ] Vercel, Supabase, and Resend logs were checked after the production test.
- [ ] The post-deadline off-Supabase backup owner and destination are agreed.

## Official references

- [Resend: Cloudflare domain setup](https://resend.com/docs/knowledge-base/cloudflare)
- [Resend: why a sending subdomain is recommended](https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain)
- [Resend: avoiding MX conflicts](https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records)
- [Resend: API-key permissions](https://resend.com/docs/dashboard/api-keys/introduction)
- [Resend: Contacts, Segments, and Contact Properties](https://resend.com/docs/dashboard/audiences/introduction)
- [Resend: Broadcast creation and personalization](https://resend.com/docs/api-reference/broadcasts/create-broadcast)
- [Resend: Broadcast scheduling](https://resend.com/blog/broadcast-schedule)
- [Resend: email attachments](https://resend.com/docs/dashboard/emails/attachments)
- [Supabase: serving private Storage files](https://supabase.com/docs/guides/storage/serving/downloads)
- [Resend: DMARC rollout](https://resend.com/docs/dashboard/domains/dmarc)
- [Cloudflare: authoritative nameservers](https://developers.cloudflare.com/dns/nameservers/)
- [Cloudflare: email records must be DNS-only](https://developers.cloudflare.com/dns/troubleshooting/email-issues/)
- [Supabase: Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase: resumable TUS uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase: Storage pricing and included quota](https://supabase.com/docs/guides/storage/pricing)
- [Supabase: cost control and Spend Cap](https://supabase.com/docs/guides/platform/cost-control)
- [Supabase: database backups exclude Storage objects](https://supabase.com/docs/guides/platform/backups)
- [Supabase: download and back up Storage objects](https://supabase.com/docs/guides/storage/management/download-objects)
