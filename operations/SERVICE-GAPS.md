# Remaining operating prerequisites

Updated September 9, 2026. The service is not yet proven by completed client sessions.

## Required before accepting a paid pilot

- Complete enrollment and identity review for the 10 real applications visible at final verification. There are 15 application records including five marked tests; none currently passes the evidence gate. Use the published Application Review interface and HOW-TO-REVIEW.md. Approval now safely creates or updates the durable panelist after the evidence and identity checks.
- Airtable now has Application Eligibility, reviewer/date, withdrawal/test fields, scope and completion/payment evidence fields. The panel summary cannot certify readiness by checkbox. The cross-table lookup, link count and contact match are connected and enforced. Do not advertise Active as available.
- Agree a concrete brief, price, completion rule, cancellation exposure, decision deadline and incentive funding. Use the quote and closeout templates. No payment integration is needed to make a first manual payout; actual account access and funding are needed.
- Reconcile the historical 21st screener row marked Owed and the 10 missing payout timestamps against provider evidence. Do not mark anyone paid from a status guess.
- Confirm legal/entity and billing details, procurement requirements and who owns the actual client agreement. Brand files no longer assert an unverified LLC suffix.

## Operator routine

Joey owns New Study Requests. Check the Airtable queue and hello@campustakes.com at the beginning and end of each business day. Record the first response and next action in Approved Scope until volume justifies dedicated workflow fields. The website promises an initial response, not a guaranteed feasibility result. The New study request → owner alert automation is enabled and sends only to hello@campustakes.com. Its trigger configuration and action were tested; keep the twice-daily table check as a fallback.

Prioritize interested existing conversations, then a small qualified batch under the existing send caps. Pause optional broad discovery spending while the 224-contact inventory is worked and reverified near use.

## Access and systems still requiring attention

- Airtable Chrome sign-in now works. Vercel browser sign-in remains blocked, but its CLI is authenticated; Airtable and Gmail connectors work. Vercel lists production security variables, but the CLI export does not expose their values. No credentials were replaced.
- Confirm whether the unrelated outbound business-mail traffic is an expected warmup service. If expected, assess its cost and reputation impact in that service; if unexpected, review authorized apps and sessions. No account was disconnected on an assumption.
- Five superseded Airtable automations are off: legacy applicant welcome/verify, legacy school-email code, Study 1 invite, Study 1 nonresponder follow-up and Study 1 automatic Paid At stamping. The old blind-create promotion and guessed payment timestamp automations remain off. The new guarded review/withdrawal workflow, inquiry owner alert and weekday owner digest are on. See AIRTABLE-AUTOMATIONS.md.
- The superseded Jotform is disabled and points to native intake; all 11 submissions remain. Its four tests and seven real applicants were reconciled to Airtable. A new real native v3 application arrived during implementation with verified email and phone timestamps, demonstrating successful live intake. Provider delivery logs and failure-rate monitoring were not comprehensively audited.
- Private outreach cooperating writers now use a shared lock, stale-write checks and a recoverable multi-file transaction journal. Fault, stale-write and recovery tests pass. Manual file edits and tools bypassing that lock still require care; this is not a database transaction system.
- Airtable workspace settings show Team, Monthly, one paid user, with 25,000 automation runs and 100,000 public API calls per month. Usage showed 4 runs and 53 API calls when checked September 9. No plan or billing change was made. No upgrade is needed for the delivered workflows; reassess before downgrading because automation scripts depend on plan capabilities.

## Evidence to collect after each project

Invite/response/qualification/attendance counts with denominators; all completion and payout timestamps; actual incentives and fees; founder hours; invoice collection time; exceptions; and repeat purchase. Ask separately for reference permission. Update public claims only from supported results.
