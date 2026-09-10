# Campus Takes panel standard

The product is not a large email list. It is a small, current, consented group of
real students who respond, match honestly, attend, and get paid quickly.

## Historical baseline — September 9, before automatic admission

- 77 total legacy panel records
- 44 currently marked Active after removing one clearly flagged record
- 18 Active records have a valid email check, email verification, and no fraud flag;
  these are **provisional legacy** members, not current-standard members
- 26 Active records need reverification
- 0 records yet satisfy the new current-intake plus human-approval standard
- 25 of the 44 Active records are Penn State; 19 are spread across 19 other schools
- no duplicate email or phone exists inside the Active cohort
- 20 historic Study 001 completions are recorded; no client sessions exist
- Final implementation check: 10 real applications (three native and seven legacy),
  plus five explicitly marked test records. All real applicants need further review.

The Airtable `Panel Quality Tier` field now makes this distinction visible:

- `READY — current`: approval plus one current application, matching contact key and live evidence gate
- `HOLD — application incomplete or expired`: approved checkbox cannot bypass an incomplete or expired application
- `PROVISIONAL — legacy`: email-verified legacy record with no saved risk flag
- `HOLD — reverify`: verification is missing or insufficient
- `HOLD — risk` / `HOLD — inactive`: do not invite

## Current-standard admission gate

Updated September 9 after owner authorization: routine panel admission is automatic after native proof, current consent, a student declaration, school/domain consistency, graduation checks and identity checks pass. Human review handles exceptions only. Independent enrollment evidence is an additional assurance level for concerns or client requirements, not a universal signup requirement. READY — current means current panel admission; it does not certify independent enrollment or a particular study's eligibility. This supersedes the earlier blanket document and human-approval requirements. The first automatic batch admitted nine people: five new panel records and four updates; one contact conflict was held. Total panel records became 82.

A panelist may be counted as current-ready only after all of these are true:

1. Age 18+ affirmed and birth year is plausible.
2. School email control verified by OTP.
3. Phone control verified by OTP.
4. Current enrollment declared by the applicant. Independent evidence is required for unresolved enrollment concerns or a client study's agreed requirement. Its actual method, date and notes must be recorded before labeling enrollment Verified.
5. School, email domain, graduation timing, and application answers are consistent.
6. Five-minute phone screen completed when identity or response-quality confidence
   needs a human check. It is not necessary for an obviously consistent low-risk
   applicant.
7. Current consent version accepted; SMS remains optional.
8. No duplicate identity, material contradiction, fraud signal, or professional-
   respondent concern remains unresolved.
9. The application is linked to exactly one Panelists record.
10. Automatic checks record their own provenance in Reviewed By, never Joey's name. A human reviewer enters their name only for an exception approval. An unscheduled routine phone screen becomes Not required. Approval is published only after the durable panelist has been linked successfully.
11. Application Eligibility reads PASS. That formula checks expiry and withdrawal;
    it does not validate link cardinality or study limits. Check those separately.

Never reject someone because their demographics are commercially inconvenient. Use
eligibility and diversity attributes for study matching and panel-balance recruiting,
not for judging a person's quality.

## Fastest cleanup path

### Wave 1: establish a trusted nucleus

1. Native applications are now processed automatically. Legacy applications need current consent and verified contacts through the current form. Only exceptions need human review.
2. Match both normalized email and phone across all panel records before linking.
   No non-test application currently has an exact two-contact match. Do not merge
   partial matches or create a new panelist before resolving identity conflicts.
3. Ask the 18 provisional legacy members to complete the native intake again.
4. Admit only records that pass the current gate; manually handle the exceptions the automatic checks identify.
5. Aim for **20–30 current-ready members**, not a cosmetic total count.

### Wave 2: recover or retire old records

1. Invite the remaining 26 Active/unverified records to reverify once.
2. Send one reminder after seven days.
3. Move nonresponders to Inactive after 14 days. Keep the record for suppression and
   history; do not delete it merely to improve metrics.
4. Never include an unverified record in a client feasibility count.

### Wave 3: grow deliberately

Grow to **100 current-ready students** before optimizing for thousands. Recruit in
small waves against actual coverage gaps:

- reduce Penn State from 57% of Active records toward approximately 50% as a portfolio preference, not a hard admission quota;
- build depth at several campuses rather than one person at dozens of schools;
- include community colleges, public and private four-year schools, and graduate/
  professional programs;
- track major area, class year, employment, device access, availability, and recorded-
  session willingness;
- use demographic information to monitor representation, never as a universal quota;
- keep the share of frequent paid-research participants visible and study-specific.

The acquisition channels worth testing first are referrals, student organizations,
and narrowly targeted campus social accounts. Existing records show social media
created most of the legacy panel, while friend/referral is strongest among recorded
application sources. Every campaign should use a distinct `?src=` code.

## Panel health metrics

Review monthly and after every study:

| Metric | Initial standard |
|---|---:|
| Current-ready / presented as available | 100% |
| Duplicate active identities | 0 |
| Unresolved risk flags among invitees | 0 |
| Independent enrollment evidence, when relied upon | no more than 12 months, or a stricter client requirement |
| Profile confirmation age | no more than 6 months |
| Valid-completion payout | within 1 business day |
| Studies per panelist | no more than 2 per month |
| Same-category cooldown | at least 90 days |
| Campus concentration | monitor; recruit down from current 57% Penn State |

Do not set a show-rate target until real client sessions create a denominator. Do not
set arbitrary response-rate or diversity targets until multiple study types show what
healthy performance looks like.

## Human review sequence

Use the published private [Needs your attention](https://airtable.com/appSfUlKrUVeUN7bG/pagFCIGFnC1wou223)
and [Current-ready panel](https://airtable.com/appSfUlKrUVeUN7bG/pag1dBHnibGnInYHH) pages.
Follow HOW-TO-REVIEW.md for exceptions only. Automatic admission and manual exception approval both perform identity matching, linking,
profile copying and processing stamps. Read Panel Transfer
Result and resolve any HOLD; do not bypass it with manual approval checkboxes. Expiry,
withdrawal or failed application review removes readiness through the live gate.
Recheck study caps, suppression and current answers at invitation. Welcome messages
remain a deliberate owner action recorded with the applicant.
