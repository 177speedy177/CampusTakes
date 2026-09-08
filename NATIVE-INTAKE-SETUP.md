# Native student intake setup

The website now contains the application UI and three same-origin Vercel Functions:

- `POST /api/verification-start` sends an email or SMS code through Twilio Verify.
- `POST /api/verification-check` checks the code and returns a short-lived, contact-bound proof.
- `POST /api/applications` validates the full application and creates the Airtable record.

The browser never receives a Twilio or Airtable secret. It also cannot mark itself verified: the final endpoint requires signed proof for the exact email and phone number being submitted.

## 1. Twilio Verify

Create one Verify Service named `Campus Takes`. Keep SMS enabled. Use six digits and the default ten-minute code validity.

For email, finish Twilio SendGrid setup:

1. Authenticate `campustakes.com` in SendGrid (preferred) or verify `hello@campustakes.com` as a sender for initial testing.
2. Create a SendGrid dynamic template whose subject is `Your Campus Takes verification code` and whose body includes `{{twilio_code}}`.
3. In Twilio Verify, create an Email Integration with that sender and template, then attach it to the same Verify Service.

A2P registration is not used by these one-time Verify codes. The purchased 814 number can remain reserved for future study invitations and reminders after its separate messaging campaign is approved.

## 2. Airtable access

Create an Airtable personal access token with only these scopes:

- `data.records:read`
- `data.records:write`

Limit it to the Campus Takes base. The native form writes only to `Panelist Applications`; it does not change old records or create records in `Panelists`.

## 3. Vercel environment variables

Add these under the `freshtake` project for Production, Preview, and Development:

| Variable | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_VERIFY_SERVICE_SID` | Verify Service SID beginning with `VA` |
| `AIRTABLE_TOKEN` | Restricted Airtable personal access token |
| `AIRTABLE_BASE_ID` | `appSfUlKrUVeUN7bG` |
| `AIRTABLE_APPLICATIONS_TABLE_ID` | `tblpl0M3qI8H5ES2z` |
| `VERIFICATION_TOKEN_SECRET` | Random secret of at least 32 characters |
| `ALLOWED_ORIGINS` | Optional comma-separated preview origins |

Generate `VERIFICATION_TOKEN_SECRET` locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Do not paste any secret into an HTML or JavaScript file. Environment changes apply only to a new Vercel deployment.

## 4. State written on successful application

- Email Control Status: `Verified`
- Phone Control Status: `Verified`
- Enrollment Status: `Pending evidence`
- Phone Screen Status: `Not scheduled`
- Review Status: `Needs verification`

This is deliberate. OTP confirms possession of the mailbox and phone. It does not prove identity or current enrollment. Those checks remain a later human-controlled workflow.

## 5. Pre-launch check

Run:

```powershell
npm test
npm run check
vercel dev
```

On the local form, confirm:

1. A Gmail address and an `.edu.uk` address are rejected before any code is sent.
2. A real `.edu` code arrives and an incorrect code is rejected.
3. A real phone code arrives and an incorrect code is rejected.
4. Editing a verified email or phone invalidates its verification.
5. A successful application creates exactly one `Panelist Applications` record with the states above.
6. Reusing the same school email reports that an application already exists.

Only after those checks should the site be deployed to production and the old Jotform integration be disabled.
