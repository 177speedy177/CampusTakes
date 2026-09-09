# Campus Takes website security audit — September 8, 2026

## Scope

Reviewed every public website page, browser script, Vercel function, shared API helper, deployment
configuration, package manifest, and currently tracked secret pattern in the Campus Takes repository.
The outreach system was checked for accidental secret exposure but was not treated as public web code.

## Fixed in this pass

| Risk | Resolution |
|---|---|
| Automated abuse of paid Twilio verification | Cloudflare Turnstile is required server-side before paid calls. |
| Serverless rate-limit bypass | Replaced process-local production limits with atomic Upstash Redis limits. |
| Distributed targeting of one email or phone | Added separate requester-IP and target-contact limits. |
| Duplicate application race | Added an atomic Redis claim before the Airtable existence check/write. |
| Applicant email enumeration | Removed the pre-verification duplicate response; duplicates are revealed only after ownership proofs. |
| Cross-site POSTs and non-browser calls | Production requires an allowed Origin and JSON content type. |
| Oversized/malformed request bodies | Enforced a 50 KB maximum and object-only JSON parsing. |
| Browser injection/clickjacking exposure | Added CSP, HSTS, nosniff, frame denial, referrer, permissions, and opener headers. |
| Third-party research-request embed | Added a narrow iframe sandbox and no-referrer policy. |
| Bot provider/privacy mismatch | Updated the privacy policy for Cloudflare Turnstile and Upstash Redis. |

## Checks that passed

- No public `.env`, `.git/config`, `package.json`, or `vercel.json` path was exposed on the live site.
- No embedded production credential was found in the current source tree.
- `npm audit --omit=dev` reported zero known package vulnerabilities.
- Browser-generated content uses DOM text nodes rather than HTML injection sinks.
- API credentials remain server-only and provider calls use bounded timeouts.
- Thirteen intake/security tests and all JavaScript syntax checks pass.
- Both existing inline scripts match the exact hashes allowed by the new CSP.

## Deployment blockers

The secured build must not be deployed until Cloudflare Turnstile and Upstash Redis are created and
their four required environment variables are added in Vercel. Production intentionally fails closed without
them. The currently deployed version has HSTS, but the new CSP and bot endpoint are not live yet.

## Residual risks and next reviews

- Provider dashboards and account security cannot be proven from source. Enable MFA for Vercel,
  Cloudflare, Twilio, Airtable, Upstash, the domain registrar, and the business email account.
- Confirm least-privilege membership and remove unused team accounts in each provider.
- Keep Vercel preview URLs private or add each intentional preview hostname to both Turnstile and
  `ALLOWED_ORIGINS`; do not wildcard either setting.
- Review Airtable exports before opening them in spreadsheet software; user-entered text should be
  neutralized at export time to prevent spreadsheet-formula interpretation.
- Add uptime/error monitoring after launch and investigate unexpected Turnstile failures, Redis
  limits, Twilio spend, or application spikes.
- A dedicated Git-history secret scanner was not installed. Run one before making the repository
  public, even though the present working tree is clean.
