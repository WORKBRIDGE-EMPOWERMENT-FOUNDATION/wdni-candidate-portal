# WDNI Candidate Portal

Shortlisted candidates for the **Women Drive Nigeria Initiative (Pioneer 100)** sign in with a one-time code, fill in their biodata, upload documents and submit. HR reviews, approves or sends applications back for changes, and exports everything to Excel.

Built with Next.js 15, Supabase (database, sign-in, private file storage) and Tailwind CSS.

## What's in it

**Candidates**
- Sign in with the email or phone number on the shortlist. A 6-digit code is sent. No passwords. People who aren't on the shortlist can't get in.
- A 7-step form with: Personal details · Next of kin · Driving experience · Guarantor · Health & fitness · Documents · Review & submit.
- Drafts save as they go, so candidates can sign out and come back later.
- Document uploads (JPG/PNG/PDF, max 5 MB): passport photo, NIN slip, driver's licence (if they have one), signed guarantor form, medical certificate, education certificate (optional).
- A printable guarantor form at `/guarantor-form`.
- After submitting, the form is locked and shows its status. If HR picks "Needs changes", the form reopens with HR's note at the top.

**HR (`/admin`)**
- Candidate list with counts by status, filters and search.
- Add candidates one at a time, or import a CSV (`full_name, email, phone`).
- Candidate page: every answer, links to each document, approve / needs changes / reject, a note for the candidate, and delete.
- **Export to Excel**: one row per candidate with every field and which documents were uploaded.
- A ready-to-copy invite message to send to shortlisted candidates.

## Setup (about 20 minutes)

### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) and create a new project. Pick a region close to Nigeria, e.g. *West EU (London)* or *Central EU (Frankfurt)*.
2. Open **SQL Editor**, paste in the contents of `supabase/schema.sql`, and run it.
3. Add yourself (and other HR staff) as admins. In the SQL Editor, run:
   ```sql
   insert into public.admins (email, full_name) values ('hr@workbridgefoundation.org', 'HR Desk');
   ```

### 2. Make sign-in emails send a code, not a link
Go to **Authentication → Emails → Templates → Magic Link** and replace the body with something like this:
```html
<h2>Your WDNI portal code</h2>
<p>Enter this code to sign in: <strong style="font-size:24px">{{ .Token }}</strong></p>
<p>It expires in 1 hour. If you didn't request it, ignore this email.</p>
```
Do the same for the **Confirm signup** template, because first-time sign-ins use it.

Supabase's built-in email sender only allows a few emails per hour. Before inviting candidates, go to **Authentication → Emails → SMTP Settings** and connect a real sender, such as Resend, Brevo, Zoho or Google Workspace SMTP.

### 3. Turn on SMS codes (optional, recommended)
Go to **Authentication → Sign In / Providers → Phone**, enable it, and connect an SMS provider. Twilio, Vonage and MessageBird are built in. Without this step, candidates can still sign in by email, but phone sign-in will fail.

### 4. Set the site URL
Go to **Authentication → URL Configuration** and set the Site URL to your portal address, e.g. `https://portal.workbridgefoundation.org`.

### 5. Run it locally
```bash
cp .env.example .env.local   # then fill in the values from Supabase → Project Settings → API
npm install
npm run dev                  # open http://localhost:3000
```

### 6. Deploy
Push the project to GitHub, import it in [Vercel](https://vercel.com), and add the four variables from `.env.example` under Project → Settings → Environment Variables. Point a subdomain such as `portal.workbridgefoundation.org` at it.

## Daily use
1. **Add the shortlist** at `/admin/shortlist`, either by importing the spreadsheet or adding people one by one. Candidates must sign in with exactly the email or phone number you enter.
2. **Send the invite message** shown on that page by email, SMS or WhatsApp.
3. **Track progress** on `/admin`: Not started → In progress → Submitted.
4. **Review** each submitted candidate, then set Approved, Needs changes (with a note) or Not selected.
5. **Export to Excel** at any time.

## Security and data protection
- Every table has row-level security. Candidates can read and change only their own record, and only until they submit. Only emails in the `admins` table can see other people's data.
- Documents are stored in a **private** bucket. HR opens them through links that expire after one hour.
- The service-role key is used on the server only, to check the shortlist before a code is sent. Never put it in client code or commit it.
- The portal collects NIN, ID documents and health information. Under the **Nigeria Data Protection Act 2023**, keep a privacy notice for the programme, limit admin access to the people who need it, and decide how long you keep records after the cohort ends. The declaration on the final step covers candidate consent. Have someone review that wording, and the guarantor form wording, before going live.

## Changing the form
All questions are defined in `lib/form-config.ts`. To add a question:
1. Add a column in Supabase: `alter table public.submissions add column new_field text;`
2. Add a matching entry to the right section in `lib/form-config.ts`.

The form, review screen, admin view and Excel export update automatically.

## Project layout
```
app/
  page.tsx                 Landing page
  login/                   Email/phone + one-time code sign-in
  portal/                  Candidate form, document uploads, submit
  guarantor-form/          Printable guarantor form
  admin/                   HR dashboard, candidate review, shortlist import, Excel export
components/                Shared UI
lib/form-config.ts         All form questions, validation and required documents
lib/supabase/              Supabase clients and session middleware
supabase/schema.sql        Database tables, security rules and storage bucket
```
