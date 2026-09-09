# Review an applicant and add them to the panel

Lost in Airtable? Start with [Your panel, simply](START-HERE.md) for the full panel list, the refresh email log, and an explanation of enrollment evidence.

Open [Application Review](https://airtable.com/appSfUlKrUVeUN7bG/pagjk93ww3acYIpdX). This is the published owner interface. Test records are excluded. The Review Next Step column tells you what needs attention. Expand a person to review their answers and evidence.

1. Check the applicant's identity, current consent, adult affirmation and verified email/phone. Legacy applicants with missing proof need to complete the current [student application](https://www.campustakes.com/students). Do not manually manufacture OTP or consent evidence.
2. Review current enrollment evidence. Set Enrollment Status to Verified, select Enrollment Verification Method, enter the actual Enrollment Verified At date/time, and write a short Enrollment Evidence Notes entry recording what you checked. Retain only necessary evidence; avoid grades, full IDs or financial information. An enrollment date is when you verified enrollment, not when you opened the record.
3. Set Phone Screen Status to Completed if you did a screen, or Not required for a consistent applicant who does not need one. Resolve material risk flags using evidence. Enter your name in Reviewed By and any useful Review Notes.
4. Set Review Status to Approved **last**. The automation checks eligibility and identity, reuses an exact existing email-and-phone match or creates a new panelist, copies supported current profile fields, links the records and stamps the processing/review dates. You do not copy rows or check Current Intake Approved yourself.
5. Read Panel Transfer Result. DONE means the transfer finished. Confirm the person appears in [Current-ready panel](https://airtable.com/appSfUlKrUVeUN7bG/pag1dBHnibGnInYHH) before counting them as available. HOLD gives the reason and moves the application to On hold; correct the issue and select Approved again. A transfer error in automation history may be retried after resolving the error; exact identity matching prevents routine retries from creating another person.

If two existing records share either contact, an identity is suppressed, or names/contact details disagree, resolve the conflict deliberately. Never clear a Blacklist or fraud history just to make a transfer pass. Approval is a human judgment; demographic usefulness does not determine a person's quality.

To record a real withdrawal, enter its actual timestamp in Consent Withdrawn At. The workflow removes approval and makes linked or exact-contact panel records Inactive, preserving Blacklist. Removing a withdrawal timestamp does not automatically reactivate anyone. Record renewals on a fresh application and resolve suppression deliberately.

Enrollment expires no later than 12 months after verification. The current-readiness formula also requires a review within six months. Check the linked current application for full matching answers: optional blanks do not erase old profile fields, and incompatible legacy choices are listed in the transfer result instead of guessed. Study-specific fit, availability, participation caps and category cooldowns still require review before invitation.

On September 9 the queue contained 10 real applications and zero current-ready panelists. No real applicant was approved during implementation. Welcome or evidence-request messages remain a deliberate owner action; no student email is sent by the review automation.
