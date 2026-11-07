# Accounts (optional) — setup

The site works with no account. If you add the two settings below, an
"Use on more than one device" page appears and signed-in people get their
lessons and series synced. Leave them out and none of it shows.

Sign-in is by email: a link, plus a 6-digit code in the same email. Only
lessons and series sync; practice progress stays on the device.

## One-time setup (about 10 minutes)

1. Make a free project at <https://supabase.com>.
2. **SQL editor** → paste the whole of `supabase/schema.sql` → Run. This
   creates the tables, the "only your own row" rules, a `plan` column for a
   future paywall, and the "delete my account" function.
3. **Authentication → URL configuration**
   - Site URL: your live address (for example `https://spell-stars.pages.dev`).
   - Redirect URLs: add `https://spell-stars.pages.dev/account` and
     `http://localhost:3000/account`.
4. **Authentication → Email templates → Magic link**: add the code to the
   message so people can type it on another device, for example
   `Your code is {{ .Token }}` under the button.
5. **Project settings → API**: copy the *Project URL* and the *anon public* key.
6. Give the site those two values as build settings:
   - Locally, in `.env.local` (not committed):
     ```
     REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
     REACT_APP_SUPABASE_ANON_KEY=eyJ...
     ```
   - On your host (for example Cloudflare Pages → Settings → Environment
     variables), the same two names, then redeploy.

The anon key is meant to be public. What a person can read or change is set by
the rules in `schema.sql`, so never put the *service role* key in the site.

## Before real launch

- When your own email sender is set up, add `REACT_APP_SMTP_CONFIGURED=true` to the site's build settings. Until then (the default) the sign-in page says the email comes from `Supabase Auth <noreply@mail.app.supabase.io>` and to check junk; once true it also offers the 6-digit code box, which needs step 4 above.

- Supabase's built-in email sender is limited to a few emails an hour. Add a
  proper sender under **Authentication → SMTP settings** (Resend, Postmark or
  SES) so links arrive reliably.
- Check the privacy wording on `/account` and the About page, because the site
  will now hold email addresses.

## Later: the paywall

Every account gets a `profiles` row with `plan = 'free'`. A payment webhook
(with the service role key, server side) can set it to `'paid'`, and the sync
can then apply limits. Nothing in the lesson data needs to change.
