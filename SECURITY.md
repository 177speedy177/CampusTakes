# Campus Takes website security

## Current controls

- Cloudflare Turnstile protects verification and application endpoints.
- A signed, 15-minute, IP-bound bot proof avoids making a student repeat the challenge for every step.
- Upstash Redis provides cross-instance IP/contact rate limits and an atomic duplicate-submit lock.
- Email and phone ownership proofs are signed, contact-bound, and expire after 30 minutes.
- Request origin, JSON content type, and a 50 KB body limit are enforced on every POST endpoint.
- Global CSP, HSTS, clickjacking, MIME-sniffing, referrer, and permissions headers are set in Vercel.
- Airtable and Twilio credentials remain server-side and outbound calls have timeouts.

## Deployment rule

Do not deploy the protected intake until every required variable in `NATIVE-INTAKE-SETUP.md` is set.
The production endpoints deliberately return 503 if Turnstile or durable rate limiting is absent.

After deployment, verify the response headers and complete one real email/SMS application. Review
Vercel, Cloudflare, Twilio, Upstash, and Airtable logs for unexpected errors or spikes.

## Secret handling

- Keep `.env` files out of Git. Never place credentials in browser JavaScript or HTML.
- Give Airtable tokens access only to the required base and read/write record scopes.
- Rotate a credential immediately if it appears in a commit, screenshot, chat, or public log.
- Rotating `VERIFICATION_TOKEN_SECRET` invalidates outstanding verification and bot proofs.

## Incident checklist

1. Disable the affected Vercel deployment or endpoint if abuse is actively costing money or exposing data.
2. Revoke and rotate affected provider credentials.
3. Preserve provider and Vercel logs before their retention window expires.
4. Identify impacted records and people, then obtain legal guidance on required notifications.
5. Correct the root cause, test it in Preview, and only then restore Production.
