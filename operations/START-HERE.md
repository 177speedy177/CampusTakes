# Your panel, simply

Use the Panel Quality interface. You do not need to operate the Automations editor.

- [All panel records](https://airtable.com/appSfUlKrUVeUN7bG/pagGjErhSzPcu2ONq): your existing panel and participation history. 77 records at the September 9 refresh.
- [Application Review](https://airtable.com/appSfUlKrUVeUN7bG/pagjk93ww3acYIpdX): new applications to check. There were 10 real applications: three through the new form and seven legacy submissions. Joey and other tests are excluded. These are separate records, not necessarily 87 unique people across both tables.
- [Current-ready panel](https://airtable.com/appSfUlKrUVeUN7bG/pag1dBHnibGnInYHH): people who passed the current review. An empty page means nobody has passed the new checks yet; your old panel still exists.
- [Refresh invitations](https://airtable.com/appSfUlKrUVeUN7bG/paguX2nPo6XtFaIW1): the 69 one-time update emails sent September 9. The automation is now paused. No automatic reminders are scheduled.

## What to do next

1. Let older members complete the updated form. Their submissions appear in Application Review. Do not copy or delete their old rows.
2. Start with the three real new-form applicants: Bella Dinger, Mikenna Schneider and Trinity Batchelder.
3. Check current enrollment. School-email and phone codes prove control of those accounts; they do not independently prove current enrollment. The current signup does not collect an enrollment document. Arrange a brief student-portal check showing their name, school and current term, or review equivalent redacted evidence. Never request passwords; avoid retaining grades, full student IDs or financial details. Record the method, actual check date and a short note.
4. Follow [the short review checklist](HOW-TO-REVIEW.md), then set Approved last. A successful transfer updates a matching old panelist and preserves participation history. Conflicting identities stay on hold for review.
5. Before inviting anyone to a paid study, check current readiness and that study's eligibility. If someone replies that they left school or wants to leave the panel, record that and stop future invitations.

## September 9 refresh record

69 distinct eligible legacy addresses received the refresh email: 63 from Panelists and six from legacy Applications. The three real new-form applicants, owner/test records, inactive/blacklisted or flagged records, and unusable school addresses were excluded. There was one additional owner-only preview email. Airtable recorded success and a SentAt timestamp for every real invitation; this is not independent confirmation of inbox delivery.

The 77 old Panelists records comprise 44 Active, 28 blank statuses, four Inactive and one Blacklist. A blank status is unreviewed, not an opt-out. Earlier descriptions that grouped all 33 non-Active records as inactive were inaccurate. The transfer now accepts a blank-status legacy record only after a full new review and an exact identity match; suppressed or flagged records remain blocked.

The refresh automation triggers only on Status = Queued and an empty SentAt, sends one individual email, then stamps Sent and its actual runtime. It is OFF after this completed batch. Do not clear SentAt or requeue sent records. A failed run after an email succeeds requires checking history before any retry to avoid a duplicate.
