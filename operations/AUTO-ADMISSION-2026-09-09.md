# Automatic admission release

Authorized by the owner to replace routine manual approvals with automatic admission and exception review.

## Live result

- Automatic admission enabled; manual exception/withdrawal automation enabled.
- First batch: nine admitted (five new panel records and four matched legacy updates), one partial-contact conflict held. 82 durable panel records; nine READY — current.
- Tests and seven legacy applications were not admitted without current native proof.
- All nine admissions retained SELF-REPORTED enrollment. Machine provenance is Automatic eligibility checks v1; no fabricated human review or independent enrollment evidence.
- Same owner page URL now shows Needs your attention, filters actual exceptions/stalled processing and includes short instructions. The old full Application Review page is hidden from navigation but preserved.
- Owner digest updated and script-tested without sending another email. No participant messages, subscription changes, payments or new AI actions.
- Website deployed READY: dpl_EaS1A35bVkMfuzArGEm55bLEo39n. Student/research pages returned 200 with matching automatic-admission wording.

## Safeguards and limits

Source: panel-transfer.mjs. Native v2/v3 only; verified contacts; consent; adult/student declaration; fresh application; required core fields; school/domain mapping; graduation timing; risk, duplicate and suppression checks. Unknown school names require review rather than fuzzy guessing. Seven institutions are initially in the domain catalog. The catalog includes official source URLs; it checks institutional domain ownership, not enrollment. Expand it from official sources as new schools arrive.

Tests: 36 passed, syntax checks passed. Live dry run identified a clean application without writing; live admission then produced an approved, linked, PASS record. Real batch verified nine PASS records and the one HOLD. Manual runner safely skipped the explicit test fixture; digest returned nine admitted, one exception, seven waiting for the updated form.

Airtable NOW was observed cached at 00:25:25 while a valid processing timestamp was 00:26:20. The live gate allows 15 minutes for cached clock display; the script still rejects future proof against its real runtime clock. This prevents newly admitted records incorrectly appearing held. Expiry and withdrawal remain enforced. Do not interpret machine-checked data as independently proven truth.

Reruns preserve identity and timestamps. Airtable offers no multi-record transaction: a failed write can leave an incomplete transfer on hold. The exception queue includes Ready for review records stalled beyond 15 minutes and admitted profiles whose live evidence gate stops passing. Before retrying, inspect the failure; never erase suppression or change a contact merely to make the gate pass.

## Recovery

Pause automatic admission if unexpected records are admitted or transfers fail repeatedly. Keep manual withdrawal handling enabled. Restore source/policy from commit 7840697 and previous formulas from the private backups if needed. Restore the website to dpl_HCUGUbQL6jGxpdG4Wtnoy18Ly6vy only if its new copy/intake fails. Do not erase valid admissions or historical participation. Private pre-change records, transitions and final receipts are in outreach/output/auto-admission-*.json.
