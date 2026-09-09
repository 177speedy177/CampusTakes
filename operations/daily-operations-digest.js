// Airtable automation script: read-only operating queue digest. No participant PII.
const value = v => v?.name ?? String(v ?? '');
async function rows(name, fields) { return (await base.getTable(name).selectRecordsAsync({fields})).records; }
const applications = await rows('Panelist Applications',['Submitted At','Test Record','Review Status','Processed At','Consent Withdrawn At','Enrollment Verification Expires','Panel Transfer Result']);
const panelists = await rows('Panelists',['Status','Panel Quality Tier']);
const requests = await rows('Study Requests',['Status','Approved Scope']);
const sessions = await rows('Sessions',['Status','Payment Status','Paid At','Completion Confirmed At','Payment Reference','Session date']);
const screeners = await rows('Screener Responses',['Payment Status','Paid At']);
const get = (r,f) => r.getCellValue(f), str = (r,f) => value(get(r,f));
const real = applications.filter(r => get(r,'Submitted At') && !get(r,'Test Record'));
const pending = real.filter(r => !get(r,'Consent Withdrawn At') && !['Rejected','Duplicate'].includes(str(r,'Review Status')) && !get(r,'Processed At'));
const conflicts = real.filter(r => str(r,'Panel Transfer Result').startsWith('HOLD'));
const ready = panelists.filter(r => str(r,'Panel Quality Tier') === 'READY — current').length;
const activeHeld = panelists.filter(r => str(r,'Status') === 'Active' && str(r,'Panel Quality Tier') !== 'READY — current').length;
const nearExpiry = real.filter(r => get(r,'Processed At') && get(r,'Enrollment Verification Expires') && Date.parse(get(r,'Enrollment Verification Expires')) <= Date.now() + 7*86400000 && !get(r,'Consent Withdrawn At'));
const openRequests = requests.filter(r => !['Done','Complete','Completed','Closed','Cancelled','Canceled','Rejected'].includes(str(r,'Status')));
const paymentExceptions = sessions.filter(r => {
 const paid = ['Paid','Sent','Confirmed'].includes(str(r,'Payment Status'));
 return str(r,'Payment Status') === 'Failed' || (get(r,'Completion Confirmed At') && !paid) || (paid && (!get(r,'Paid At') || !get(r,'Payment Reference'))) || (['Held','Paid','Completed'].includes(str(r,'Status')) && !get(r,'Completion Confirmed At'));
});
const historicalOwed = screeners.filter(r => str(r,'Payment Status') === 'Owed').length;
const historicalMissingDates = screeners.filter(r => ['Paid','Sent','Confirmed'].includes(str(r,'Payment Status')) && !get(r,'Paid At')).length;
const actionable = pending.length + conflicts.length + nearExpiry.length + openRequests.length + paymentExceptions.length + historicalOwed + historicalMissingDates;
const body = `Campus Takes daily operating check\n\nCurrent-ready panelists: ${ready}\nActive records still on hold: ${activeHeld}\nApplications awaiting review: ${pending.length}\nTransfer conflicts: ${conflicts.length}\nEnrollment expired or due within 7 days: ${nearExpiry.length}\nOpen study requests: ${openRequests.length}\nSession payment/completion evidence exceptions: ${paymentExceptions.length}\nHistorical screener rows marked Owed: ${historicalOwed}\nHistorical paid/confirmed rows missing Paid At: ${historicalMissingDates}\n\nReview applicants: https://airtable.com/appSfUlKrUVeUN7bG/pagjk93ww3acYIpdX\nCurrent-ready panel: https://airtable.com/appSfUlKrUVeUN7bG/pag1dBHnibGnInYHH\nStudy requests: https://airtable.com/appSfUlKrUVeUN7bG/tbldhDHVaU6cmNIrs\nSessions: https://airtable.com/appSfUlKrUVeUN7bG/tblg7SsvK8hmcHyN9\nHistorical payments: https://airtable.com/appSfUlKrUVeUN7bG/tblv2Nv3NVwoGwfis\n\nReview evidence before approving anyone or recording a payout. Paid At is the actual provider payment time; this automation never invents it. This is an internal operating reminder, not a client or student message.`;
output.set('body',body);
output.set('actionable',actionable);
