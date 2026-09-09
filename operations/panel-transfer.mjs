// Pure review/identity policy. Airtable runner is generated from this file.
export const textValue = v => Array.isArray(v) ? v.map(textValue).join(', ') : v?.name ?? String(v ?? '');
export const normalizeEmail = v => textValue(v).trim().toLowerCase();
export const normalizePhone = v => textValue(v).replace(/\D/g, '');
const names = (first, last) => `${textValue(first)} ${textValue(last)}`.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const monthsAfter = (value, months) => { const d = new Date(value); d.setUTCMonth(d.getUTCMonth() + months); return d; };

export function planTransfer(application, panelists, applications, now = new Date()) {
  const a = application.fields, val = name => textValue(a[name]).trim();
  const fail = reason => ({ ok: false, reason });
  if (val('Review Status') !== 'Approved') return fail('Select Approved only after your review is complete.');
  if (a['Test Record']) return fail('Test records cannot become panelists.');
  if (a['Consent Withdrawn At']) return fail('Consent was withdrawn.');
  if ((a['Risk Flags'] || []).length) return fail('Resolve the application risk flags.');
  if (!val('Reviewed By')) return fail('Enter the human reviewer name.');
  if (!val('First Name') || !val('Last Name')) return fail('Applicant name is incomplete.');
  const email = normalizeEmail(a['School Email']), phone = normalizePhone(a['Mobile Phone']);
  if (!/^[^\s@]+@[^\s@]+\.edu$/.test(email) || phone.length < 8 || phone.length > 15) return fail('Contact details are invalid.');
  const birth = Number(a['Birth Year']);
  if (!Number.isInteger(birth) || birth < 1900 || birth > now.getUTCFullYear() - 18 || !val('Applicant Confirmations').includes('I am 18 or older and currently enrolled')) return fail('Current adult/enrollment affirmation is missing.');
  const past = field => { const t = Date.parse(a[field]); return Number.isFinite(t) && t <= now.getTime(); };
  if (val('Email Control Status') !== 'Verified' || val('Phone Control Status') !== 'Verified' || !past('Email Verified At') || !past('Phone Verified At')) return fail('Complete the native email and phone verification.');
  if (val('Consent Version') !== 'student-intake-2026-09-07' || !past('Consent Accepted At')) return fail('Current consent evidence is missing.');
  if (val('Enrollment Status') !== 'Verified' || !past('Enrollment Verified At') || !val('Enrollment Verification Method') || !val('Enrollment Evidence Notes')) return fail('Record enrollment method, verification date and a short evidence note.');
  const latestExpiry = monthsAfter(a['Enrollment Verified At'], 12);
  const expiry = a['Enrollment Verification Expires'] ? new Date(a['Enrollment Verification Expires']) : latestExpiry;
  if (!Number.isFinite(expiry.getTime()) || expiry <= now || latestExpiry <= now) return fail('Enrollment evidence has expired; reverify before approval.');
  if (!['Completed', 'Not required'].includes(val('Phone Screen Status'))) return fail('Complete the phone screen or choose Not required.');
  const candidates = panelists.filter(p => normalizeEmail(p.fields['.edu email']) === email || normalizePhone(p.fields.Phone) === phone);
  if (candidates.length > 1) return fail('Email/phone match multiple panelists. Resolve the identity conflict manually.');
  let existing = candidates[0];
  if (existing) {
    const p = existing.fields;
    if (normalizeEmail(p['.edu email']) !== email || normalizePhone(p.Phone) !== phone) return fail('Only one contact matches an existing panelist. Resolve the conflict; do not create a duplicate.');
    if (textValue(p.Status) !== 'Active' || (p['Fraud Flags'] || []).length) return fail('Existing identity is inactive, suppressed or flagged. Resolve it manually.');
    if (names(p['First name'], p['Last name']) !== names(a['First Name'], a['Last Name'])) return fail('Existing contact has a different name. Resolve the identity conflict manually.');
    const currentIds = (p['Current Application'] || []).map(r => r.id);
    if (applications.some(r => currentIds.includes(r.id) && r.fields['Consent Withdrawn At'])) return fail('Existing panelist has withdrawn consent; resolve suppression manually.');
  }
  const links = a['Linked Panelist'] || [];
  if (links.length > 1 || (links.length && links[0].id !== existing?.id)) return fail('Linked Panelist disagrees with the verified contact identity.');
  if (applications.some(r => r.id !== application.id && !r.fields['Test Record'] && !r.fields['Processed At'] && textValue(r.fields['Review Status']) === 'Approved' && (normalizeEmail(r.fields['School Email']) === email || normalizePhone(r.fields['Mobile Phone']) === phone))) return fail('Another approved application shares a contact. Choose the canonical application first.');
  return { ok: true, existingId: existing?.id || null, email, phone, expiry: new Date(Math.min(expiry, latestExpiry)).toISOString().slice(0,10), reviewer: val('Reviewed By') };
}

export async function transferReviewedApplicant(base, recordId, { dryRun = false, now = new Date() } = {}) {
  const apps = base.getTable('Panelist Applications'), panel = base.getTable('Panelists');
  const raw = await apps.selectRecordAsync(recordId);
  if (!raw) throw new Error('Application not found.');
  const asObject = (record, table) => ({ id: record.id, fields: Object.fromEntries(table.fields.filter(f => !f.isComputed).map(f => [f.name, record.getCellValue(f.name)])) });
  const application = asObject(raw, apps);
  if (application.fields['Consent Withdrawn At'] && !application.fields['Test Record']) {
    const when = Date.parse(application.fields['Consent Withdrawn At']);
    if (!Number.isFinite(when) || when > now.getTime()) throw new Error('Withdrawal timestamp is invalid or future-dated.');
    const query = await panel.selectRecordsAsync({fields:['.edu email','Phone','Status','Current Application','Current Intake Approved']});
    const email = normalizeEmail(application.fields['School Email']), phone = normalizePhone(application.fields['Mobile Phone']);
    const matches = query.records.filter(p => (p.getCellValue('Current Application') || []).some(x => x.id === recordId) || (email && phone && normalizeEmail(p.getCellValue('.edu email')) === email && normalizePhone(p.getCellValue('Phone')) === phone));
    if (!dryRun) {
      for (const p of matches) await panel.updateRecordAsync(p.id, {'Current Intake Approved':false, Status:{name:textValue(p.getCellValue('Status')) === 'Blacklist' ? 'Blacklist' : 'Inactive'}});
      await apps.updateRecordAsync(recordId, {'Panel Transfer Result':'WITHDRAWN — ' + matches.length + ' matching panelist(s) suppressed.'});
    }
    return {outcome:(dryRun ? 'DRY RUN — ' : '')+'WITHDRAWN — '+matches.length+' matching panelist(s) suppressed.'};
  }
  // An automation test may select an unapproved existing row. Never mutate it.
  if (textValue(application.fields['Review Status']) !== 'Approved') return { outcome: 'SKIPPED — application is not approved' };
  const panelQuery = await panel.selectRecordsAsync({ fields: panel.fields.filter(f => !f.isComputed).map(f => f.name) });
  const appQuery = await apps.selectRecordsAsync({ fields: apps.fields.filter(f => !f.isComputed).map(f => f.name) });
  const panelists = panelQuery.records.map(r => asObject(r,panel)), applications = appQuery.records.map(r => asObject(r,apps));
  const plan = planTransfer(application, panelists, applications, now);
  if (dryRun) return { outcome: plan.ok ? (plan.existingId ? 'DRY RUN — update existing panelist' : 'DRY RUN — create panelist') : 'DRY RUN — ' + plan.reason };
  if (!plan.ok) {
    await apps.updateRecordAsync(recordId, { 'Panel Transfer Result': 'HOLD — ' + plan.reason, 'Review Status': { name: 'On hold' } });
    return { outcome: 'HOLD — ' + plan.reason };
  }
  if (application.fields['Processed At'] && plan.existingId && (panelists.find(p => p.id === plan.existingId).fields['Current Application'] || []).some(r => r.id === recordId) && panelists.find(p => p.id === plan.existingId).fields['Current Intake Approved']) return { outcome: 'Already transferred; no duplicate or timestamp reset.' };
  const fresh = await apps.selectRecordAsync(recordId);
  if (JSON.stringify(asObject(fresh,apps).fields) !== JSON.stringify(application.fields)) throw new Error('Application changed during transfer. Review and retry.');
  const a = application.fields, skipped = [];
  const fields = {
    'First name': textValue(a['First Name']), 'Last name': textValue(a['Last Name']),
    '.edu email': plan.email, Phone: textValue(a['Mobile Phone']),
    Status: { name: 'Active' }, 'Verification Status': { name: 'Email verified' },
    'Verified At': a['Email Verified At'], 'Verification Method': { name: 'Replied to .edu email' },
    'Birth Year': a['Birth Year'], 'Adult Confirmed': true,
    'Consent Version': a['Consent Version'], 'Consent Accepted At': new Date(a['Consent Accepted At']).toISOString().slice(0,10),
    'Current Application': [{ id: recordId }], 'Current Intake Approved': false,
  };
  if (!plan.existingId) fields['Date joined'] = now.toISOString().slice(0,10);
  const mapping = { 'Academic Level':'Year', 'Major or Field of Study':'Major', 'Acquisition Channel':'How did you hear about us', 'Acquisition Detail':'Referring org/club', 'Source Code':'Source Code', 'Living Situation':'Living situation', 'Greek Life':'Greek life?', Gender:'Gender', 'Race or Ethnicity':'Race/ethnicity', 'Products or Activities':'Apps/interests', Availability:'Availability', 'Paid Research Before':'Paid Research Before' };
  for (const [source,target] of Object.entries(mapping)) {
    const value = a[source];
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
    const field = panel.getField(target), choices = new Set((field.options?.choices || []).map(c => c.name));
    if (field.type === 'singleSelect') {
      if (choices.has(textValue(value))) fields[target] = { name: textValue(value) }; else skipped.push(target);
    } else if (field.type === 'multipleSelects') {
      const values = value.map(textValue);
      if (values.every(v => choices.has(v))) fields[target] = values.map(name => ({name})); else skipped.push(target);
    } else fields[target] = textValue(value);
  }
  // A partial failure leaves readiness false. Retrying matches this same identity.
  const panelId = plan.existingId || await panel.createRecordAsync(fields);
  if (plan.existingId) await panel.updateRecordAsync(panelId,fields);
  await apps.updateRecordAsync(recordId, { 'Reviewed At': now.toISOString(), 'Enrollment Verification Expires': plan.expiry, 'Linked Panelist': [{id:panelId}], 'Processed At': now.toISOString() });
  await panel.updateRecordAsync(panelId, {'Current Intake Approved':true});
  const outcome = 'DONE — ' + (plan.existingId ? 'updated existing panelist' : 'created and linked panelist') + (skipped.length ? '. Current application retains unmapped profile fields: ' + skipped.join(', ') : '');
  await apps.updateRecordAsync(recordId, {'Panel Transfer Result':outcome});
  return { outcome, panelId };
}
