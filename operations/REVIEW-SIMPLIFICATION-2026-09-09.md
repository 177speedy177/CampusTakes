# Review simplification release

Routine admission no longer requires an enrollment document or phone call. It requires native contact proof, current consent, the adult/student declaration and the owner's review. The separate independent-enrollment fields are not manufactured or auto-marked Verified. Existing concerns, rejected/expired enrollment checks, scheduled/failed calls, suppression, tests and identity conflicts remain blocked.

Published queue: https://airtable.com/appSfUlKrUVeUN7bG/pagFCIGFnC1wou223

Updated the existing review automation and Application Eligibility/Review Next Step formulas. Added read-only Enrollment Assurance. Kept READY — current as the existing admission label so the current-panel page and owner digest continue working. It does not imply independent enrollment certification. Native intake now defaults independent Enrollment Status to Not reviewed, replacing the confusing Pending evidence default. The older value is not overwritten on existing applications.

Verification: all 33 local tests and syntax checks passed; live script parsed and safely skipped the unapproved guard fixture; saved script verified after reload; automation re-enabled. No real applicant was approved. New published queue verified in Chrome with review columns and actual incoming applications. Formula backups and execution evidence are in private outreach/output.

Six existing native submissions with verified contacts, current consent and no risk flag were relabeled Ready for review from the old Needs verification default. Their approval and evidence fields were not changed. Future native intake uses Ready for review. Production deployment dpl_HCUGUbQL6jGxpdG4Wtnoy18Ly6vy updates the website and default intake labels; student and research pages returned HTTP 200 with the revised assurance wording. A later independent enrollment check can save its bounded expiry without duplicating the already admitted panelist or resetting processing dates.

Rollback: pause review automation if transfers error or evidence classification becomes inconsistent. Restore previous source from commit 74e0df2 and formulas from private manual-review-formula-backup-2026-09-09.json. Re-enable only after a safe guard test. The older website can be restored to deployment dpl_9YZS9cSaXk82qSgGZD7u35oZDZJG. Do not revert actual applicant or participation history.
