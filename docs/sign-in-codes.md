# Setting up sign-in codes ("Send me a code")

The portal asks Supabase to send a one-time code. Supabase then delivers it:
- **by email** through your own mailbox (SMTP). This is a Supabase setting, with no code involved.
- **by SMS** through Termii. Supabase calls the portal at `/api/auth/send-sms`, and the portal sends the SMS with Termii.

Do Part A first. Email sign-in works without Termii, so you can launch with email and add SMS when your Termii sender ID is approved.

---

## Part A — Email codes from your own mailbox

### 1. Get SMTP details for the sending mailbox
Use a real mailbox on your domain, e.g. `admin@workbridgefoundation.org` or a new `noreply@workbridgefoundation.org`.

| Mail provider | Host | Port | Username | Password |
|---|---|---|---|---|
| Google Workspace | `smtp.gmail.com` | 587 | full email address | an **App password** (Google Account → Security → 2-Step Verification → App passwords) |
| Zoho Mail | `smtp.zoho.com` (or `smtp.zoho.eu`) | 587 | full email address | your password, or an app-specific password if 2FA is on |
| Microsoft 365 | `smtp.office365.com` | 587 | full email address | your password (SMTP AUTH must be enabled for the mailbox) |
| Website host / cPanel | `mail.workbridgefoundation.org` | 465 or 587 | full email address | mailbox password |

If you're not sure which one you have, check where you log in to read `admin@workbridgefoundation.org`.

### 2. Connect it in Supabase
Go to **Supabase → Authentication → Emails → SMTP Settings** and turn on **Enable custom SMTP**:
- **Sender email:** the mailbox above
- **Sender name:** `Workbridge WDNI`
- **Host / Port / Username / Password:** from the table above

Save, then go to **Authentication → Rate Limits** and raise **Rate limit for sending emails** to around 100 per hour. The default is very low.

### 3. Use the branded code email
Open `supabase/email-templates/sign-in-code.html`, copy everything, and paste it into **both** of these templates under **Authentication → Emails → Templates**:
- **Magic Link** (returning candidates)
- **Confirm signup** (first sign-in)

Set the subject of both to: `Your WDNI portal sign-in code`

The template must keep `{{ .Token }}`, because that's where the code goes.

### 4. Code lifetime
Go to **Authentication → Sign In / Providers → Email** and set **Email OTP Expiration** to `600` seconds (10 minutes), to match the wording in the email.

### 5. Test
Add your own email to the shortlist at `/admin/shortlist`. Then sign out, go to `/login`, enter that email and click **Send me a code**. The email should arrive within a minute. Check spam the first time.

---

## Part B — SMS codes through Termii (later)

Phone sign-in is **switched off** for now: the sign-in page asks for email only. When you are ready, complete the steps below, then set `NEXT_PUBLIC_PHONE_SIGNIN=true` in `.env.local` and Vercel and redeploy.

### 1. Create a Termii account
1. Sign up at [termii.com](https://termii.com) with the foundation's details.
2. Fund the wallet. Each OTP SMS costs a few naira; 100 candidates signing in a few times each needs only a small top-up.
3. In the dashboard, copy your **API key** and your **base URL** (each account has its own, e.g. `https://xxxx.api.termii.com`).

### 2. Register a sender ID
Under **Sender ID**, request `Workbridge` (maximum 11 characters) and describe the use as *"OTP / verification codes for programme applicants"*. Approval for the DND route can take a few working days.
- **Use `TERMII_CHANNEL=dnd`.** Most Nigerian lines are on Do-Not-Disturb, and only the DND route reaches them.
- `generic` works sooner, but codes won't reach DND numbers. Use it only for testing.

### 3. Turn on phone sign-in and the hook in Supabase
1. Go to **Authentication → Sign In / Providers → Phone** and enable it. Set **SMS OTP Expiry** to `600`.
2. Go to **Authentication → Hooks** and add a **Send SMS hook**:
   - **Type:** HTTPS
   - **URL:** `https://YOUR-PORTAL-ADDRESS/api/auth/send-sms` (for example `https://portal.workbridgefoundation.org/api/auth/send-sms`)
   - Click **Generate secret** and copy it. It starts with `v1,whsec_`.
3. Save. While the hook is on, Supabase hands every phone code to the portal instead of sending it itself.

> Supabase can't reach `localhost`, so SMS codes only work once the portal is deployed, for example on Vercel. For local testing, use email sign-in.

### 4. Add the settings to the portal
In `.env.local` (and in Vercel → Settings → Environment Variables), add:

```
SEND_SMS_HOOK_SECRET=v1,whsec_...        # from step 3
TERMII_API_KEY=...                        # from step 1
TERMII_BASE_URL=https://xxxx.api.termii.com
TERMII_SENDER_ID=Workbridge
TERMII_CHANNEL=dnd
```

Redeploy so the new settings take effect.

### 5. Test
Add your own phone number to the shortlist, then sign in with it. If no SMS arrives:
- **Termii dashboard → Messages:** shows whether the message was sent or rejected (for example, sender ID not approved or low balance).
- **Vercel → Logs:** search for `send-sms hook` to see the exact Termii error.
- **Supabase → Authentication → Logs:** shows whether the hook was called and what it answered.
