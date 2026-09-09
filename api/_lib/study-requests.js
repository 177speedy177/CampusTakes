const crypto = require("node:crypto");

const FIELD = {
  requestId: "fldfMhMke9OO2TlRR",
  clientName: "fld6qbyVh2WyYPLDb",
  company: "fldQ3ovkSEvaPBstN",
  email: "fldBxqGjkbs69Kxy8",
  targetDescription: "fldSDNguKiRlCBhNb",
  participantCount: "fld6jOsIF29UZpGRX",
  incentiveBudget: "fldT2g30La9QQrC6m",
  format: "fldSoVsKWh6wVHfLJ",
  dates: "fldhTuCNE0EiF7tuk",
  status: "fldxdE92eS3g5BUZv",
};

function config() {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID || "appSfUlKrUVeUN7bG";
  const tableId = process.env.AIRTABLE_STUDY_REQUESTS_TABLE_ID || "tbldhDHVaU6cmNIrs";
  if (!token) throw new Error("AIRTABLE_TOKEN is missing.");
  return { token, baseId, tableId };
}

async function createStudyRequest(value) {
  const { token, baseId, tableId } = config();
  const fields = {
    [FIELD.clientName]: value.clientName,
    [FIELD.company]: value.company,
    [FIELD.email]: value.workEmail,
    [FIELD.targetDescription]: value.targetDescription,
    [FIELD.participantCount]: value.participantCount,
    [FIELD.format]: value.format,
    [FIELD.dates]: value.timing,
    [FIELD.status]: "New",
  };
  if (value.requestId) fields[FIELD.requestId] = value.requestId;
  if (value.incentiveBudget !== null) fields[FIELD.incentiveBudget] = value.incentiveBudget;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: value.requestId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Campus-Takes-Request": crypto.randomBytes(8).toString("hex"),
      },
      body: JSON.stringify({ records: [{ fields }], typecast: false, ...(value.requestId ? { performUpsert: { fieldsToMergeOn: [FIELD.requestId] } } : {}) }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("Airtable request failed.");
      error.status = response.status;
      error.details = data.error?.type;
      throw error;
    }
    if (!data.records?.[0]?.id) throw new Error("Airtable did not confirm a saved study request.");
    return data.records[0];
  } finally {
    clearTimeout(timeout);
  }
}

async function findStudyRequest(requestId) {
  const { token, baseId, tableId } = config();
  const formula = '{Request ID}=' + JSON.stringify(requestId);
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=1&returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(formula)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Study request lookup failed.');
  const data = await response.json();
  return data.records?.[0];
}
module.exports = { FIELD, createStudyRequest, findStudyRequest };
