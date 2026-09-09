# Airtable automation inventory and operation

Verified September 9, 2026 in Campus Takes, base appSfUlKrUVeUN7bG. Workspace settings show Team Monthly with one paid user. No subscription, seat, paid add-on or payment method was changed.

| Enabled workflow | Trigger | Work |
|---|---|---|
| Reviewed applicant → safely link panelist | Review Status or Consent Withdrawn At updated | Runs the evidence/identity gate, creates or updates one durable panelist, links the application, records processing results; handles withdrawal and preserves suppression. |
| New study request → owner alert | Study Requests record created | Sends a private queue reminder to hello@campustakes.com. |
| Weekday owner digest — reviews, requests and payouts | Monday–Friday, 13:00 UTC, starting September 10 | Reads five tables and emails counts and private queue links to hello@campustakes.com. |

Review automation: wfldShpFoPQbVuopx; script wacRWPNPU3TbAB4FW; input recordId = trigger Airtable record ID. Source panel-transfer.mjs; remove the export keywords and append the runner below when updating the Airtable script:

```js
const config = input.config();
if (!config.recordId) throw new Error('Configure the triggering Airtable record ID.');
const result = await transferReviewedApplicant(base, config.recordId, {dryRun: config.dryRun === true});
output.set('outcome', result.outcome);
```

Digest: wfljZMc4zjJUAWiiS; scheduled trigger wtrHKH2dkaMOSecdG; script wac7V5fETAeQBsihG; email wac8GUtrWh5QvLEwH. Paste daily-operations-digest.js directly into Run a script; it uses Airtable's top-level await environment, not the website's CommonJS runtime. Email Message is the dynamic script output body, subject Campus Takes: weekday operating check. The digest contains counts and private links, not applicant PII. Its actionable count can overlap categories and is not a count of unique people.

Inquiry alert: wflil5FzNdRRGFlZI. Subject Campus Takes: review a new study request. Both owner-email actions were actually tested. Digest test message 1a08852fc8071636 reached INBOX and IMPORTANT on September 9 at 22:38:54 UTC. Gmail's specific sender/to/subject filter prevents these operating notices from going to Spam.

The schedule is 9am during Eastern daylight time and 8am during Eastern standard time. Airtable does not automatically adjust scheduled triggers for DST. A morning digest is sufficient; edit the schedule if a fixed 9am local time becomes necessary. [Airtable scheduled-time documentation](https://support.airtable.com/articles/5624289784-airtable-automation-trigger-at-scheduled-time).

## Limits and failure handling

The workspace usage page showed 4/25,000 automation runs and 53/100,000 public API calls at verification; counters may lag. Weekday scheduling adds about 22 runs/month, under 0.1% of the current run allowance. Each change to either watched review field can consume a run, including changes that result in SKIPPED. A failed eligibility check sets On hold and causes one further skipped run; the script does not update those fields repeatedly. Editing evidence or notes alone does not trigger it. These scripts use no AI actions or credits.

Keep failure notifications enabled and inspect History for errors. The last enabler is subscribed; review and digest each showed one subscriber. If a digest fails, open the interface and queues manually. If promotion partially fails, approval stays false until the final step; retry after investigating. The runner is designed for retries and checks concurrent changes, but Airtable provides no multi-record ACID transaction. Avoid simultaneous approval of duplicate identities.

Free has a much smaller 100-run monthly allowance and restricted capabilities; do not downgrade expecting these script-based workflows to continue unchanged. Current Team is sufficient; no Business plan or external automation service is needed. [Official run limits](https://support.airtable.com/articles/3669392397-getting-started-with-airtable-automations).

## Retired workflows

Disabled legacy applicant welcome/verify, legacy school-email code, Study 1 invite, Study 1 nonresponder follow-up and Study 1 automatic Paid At stamping. The old blind-create Approved application → active panelist and guessed Payment sent → payment timestamp remain off. Existing response-link and legacy verification-link workflows were retained. Old records and history were preserved.

No payment action marks a person paid automatically. Sessions now exposes Completion Confirmed At, Payment Reference and Payment Next Step; enter actual payment-provider evidence. Historical payment gaps are included in the digest. The one synthetic TEST-AUTOMATION-GUARD-2026-09-09 application remains explicitly flagged, on hold, with no contacts, submission timestamp or linked panelist. The live guard test blocked it from promotion.
