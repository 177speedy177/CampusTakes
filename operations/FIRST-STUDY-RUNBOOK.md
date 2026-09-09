# First paid study runbook

## 1. Qualify the opportunity

Get a concrete answer to each question before quoting feasibility:

- Who is the client and who owns day-to-day decisions?
- What business question is the research meant to inform?
- Who exactly qualifies, and who must be excluded?
- Are quotas hard requirements or preferences?
- Is the format a survey, interview, usability test, or focus group?
- Is it remote? What technology and device are required?
- What is the participant time commitment, including homework?
- Is audio, video, or screen recording required? Who retains it, where, and for how long?
- Who supplies and approves the screener?
- What exactly counts as a completed, billable session?
- What dates and time zones apply?
- Does the study expose confidential material or collect sensitive information?
- How quickly will the client confirm completion or report a problem?

Reject or escalate studies involving minors, medical interventions or diagnoses,
illegal activity, employment/credit/insurance eligibility, deceptive research,
unapproved sensitive-data collection, in-person safety risk, or a request to give the
client panelist contact/payment details.

## 2. Check feasibility

1. Convert every criterion into one of: required, quota, preference, exclusion.
2. Identify which criteria already exist in verified panel records.
3. Ask panelists study-specific questions for anything not already held. Never claim
   an attribute is queryable merely because it can be screened.
4. Count likely matches conservatively and account for the two-studies-per-month and
   90-day same-category cooldown.
5. Quote a target only after the count is known. Do not guarantee fill or attendance.
6. For a first project, prefer 5–10 participants, remote, one audience, limited quotas,
   and at least five business days of field time.

## 3. Approve the commercial scope

Use `templates/feasibility-quote.md`. The written scope must specify:

- target completed sessions;
- rate per completed session and included incentive;
- maximum authorized spend;
- completion/quality definition;
- schedule and fielding window;
- client cancellation/rescheduling treatment;
- participant no-show treatment;
- payment terms;
- data shared and recording arrangement;
- named approver on each side.

Price the actual scope, including founder time. The $120 figure is not universal.

Run `node operations/quote-economics.mjs path/to/quote-input.json` from the project root. The example input is illustrative, not verified costs. Calculate:

```text
maximum client fee = target completes x agreed rate + agreed setup fee
planned incentive cash = target completes x stated incentive
cash contribution = client fee - incentives - direct costs - acquisition costs
labor-adjusted contribution = cash contribution - total founder hours x internal hourly cost
```

Do not launch a project with negative labor-adjusted contribution unless Joey explicitly labels it
a pilot and records what evidence or relationship the discount is buying.

## 4. Prepare recruiting

1. Save the approved scope in Study Requests → Approved Scope. Verify incentive funding and cancellation exposure before recruiting. Keep Sessions as the delivery ledger.
2. Freeze the client-approved screener version and completion definition.
3. Build a candidate list using opaque panelist IDs; keep PII in Airtable only.
4. Apply eligibility, frequency cap, category cooldown, conflicts, and recording fit.
5. Have Joey approve the invitation batch.
6. Send the study-specific invitation with incentive, duration, format, recording,
   deadline, and voluntary nature plainly stated.
7. Do not reveal the client's confidential identity or materials before required
   consent/confidentiality steps.

## 5. Screen and schedule

- Store each screener outcome and timestamp.
- Do not tell a panelist which answers would qualify.
- Share only first name and relevant approved screening details with the client.
- Use unique session/survey links where the client supports them.
- Confirm the time zone in both words and abbreviation.
- Send a 24-hour reminder and a 2-hour reminder for live sessions.
- Ask the client to report a missing participant within 10 minutes.

## 6. Run fieldwork

During the field window, report facts only:

- invited;
- responded;
- screened in/out;
- scheduled;
- completed as confirmed by client;
- withdrawn/no-show;
- remaining target and emerging risk.

Never change criteria, quotas, incentive, or authorized spend without written client
approval. Log the decision as an event.

## 7. Reconcile and pay

1. Obtain the client's completion decision promptly after every session or daily for
   surveys.
2. If a completion is disputed, request the specific objective requirement that was
   not met. Do not withhold for mere dislike of an answer.
3. Pay valid completions through Tremendous within one business day.
4. Record payout amount, provider reference, and timestamp; never store redemption
   links or payment credentials in the repository.
5. Reconcile total completions, incentives, direct costs, client fees, and exceptions.

## 8. Close the client loop

1. Send `templates/client-closeout.md` with the exact delivered count and factual
   timing metrics.
2. Invoice only the agreed billable events. Default terms are net 30 after delivery.
3. Complete the internal reconciliation section of `templates/client-closeout.md`, including founder hours.
4. Ask separately for permission to name the client and quote any testimonial.
5. Schedule a short repeat-study check-in based on the client's research cadence.
6. Only after evidence and permission exist, update `outreach/OFFER.md` and the public
   panel report. Never promote internal metrics automatically.

## Stop conditions

Pause recruiting immediately when:

- the client changes eligibility or completion rules mid-field;
- a privacy, consent, safety, or discrimination concern appears;
- fraud or duplicate identity is suspected;
- the incentive cannot be funded on time;
- session links or client staff are unavailable;
- the client asks for unapproved participant data;
- projected direct costs exceed the approved client fee.
