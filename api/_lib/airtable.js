const crypto = require("node:crypto");

const FIELD = {
  applicationId: "fldO4vKzPMUYZzkbz",
  submittedAt: "fld46iJ9VIQg3ElGz",
  formVersion: "fldTX02B4e6oPchh6",
  firstName: "fldVRFEwjlBvurYth",
  lastName: "fld7vrPink5Dldruw",
  schoolEmail: "fldWDFLjM9Uvy9r8b",
  mobilePhone: "fld5eMbM2Fyqn7Lcv",
  university: "fldtj7sV8U8SfjCZr",
  campusCity: "fldUValF4XRf2qgph",
  academicLevel: "fldbk6U8porXbGp4f",
  gradMonth: "fldHN1xu17hTk3IvZ",
  gradYear: "fldUSgahXcoYXp2ht",
  birthYear: "fldKdAzvslSFFsFHv",
  academicArea: "fldcViPlrC3zCuBoG",
  otherInstitution: "fld3hyzQttU73iP7n",
  livingSituation: "fldqDIG21k7uqFdXk",
  greekLife: "fldgmaOQrEFbxuMuK",
  studentAthlete: "fldRkU1UIbKLtNLEc",
  studentBackgrounds: "fldhm1nh0KAi1lk90",
  gender: "fld9gGY0bw8Bm1F07",
  raceEthnicity: "fldcc3L86iTtSVvbu",
  employmentStatus: "fldMnNHOKMowzeJD9",
  devices: "fldNaA3onvza79AG6",
  productsActivities: "fldoIGLTmWFgvDaUx",
  availability: "fldGREmwHiPYdEBrI",
  recordingWillingness: "fldnytKoyMLojvfI6",
  paidResearchBefore: "fldHXorlRqMsXQ8pQ",
  acquisitionChannel: "fldj7RKmCt86nPw7N",
  acquisitionDetail: "fldQj3Wstf8DaEKhj",
  confirmations: "fld1pUdhw2oxBLczM",
  consentVersion: "fldO4w9kYAOFU8jY6",
  consentAcceptedAt: "fldpzrx3DymDOfNIz",
  sourceCode: "fldflRtix2d5fggAb",
  applicationUrl: "fld4BI7yrTEQaZHsq",
  emailStatus: "fldieZm6KwMg2cNS1",
  emailVerifiedAt: "fldFKVLXpcfERVISC",
  phoneStatus: "fld2sOvlGXdkbJob9",
  phoneVerifiedAt: "fldiFoc2RMjv0iMJk",
  enrollmentStatus: "fldCDBLsGWVoIJTv6",
  phoneScreenStatus: "fldhBJF7b7QRxUBX8",
  reviewStatus: "fldFvCsgywpA91cv7",
  major: "fldEARAmIY0tWrGJU",
  smsConsent: "fldKTyDp8YpN9xpmW",
};

const CONFIRMATIONS = [
  "I am 18 or older and currently enrolled at a college or university.",
  "The information I provided is accurate.",
  "I agree that Campus Takes may contact me by email about my application and paid research opportunities. I can unsubscribe at any time.",
];
const SMS_CONSENT = "I agree to receive recurring automated text messages from Campus Takes at the mobile number provided.";

function config() {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID || "appSfUlKrUVeUN7bG";
  const tableId = process.env.AIRTABLE_APPLICATIONS_TABLE_ID || "tblpl0M3qI8H5ES2z";
  if (!token) throw new Error("AIRTABLE_TOKEN is missing.");
  return { token, baseId, tableId };
}

async function airtableRequest(query = "", options = {}) {
  const { token, baseId, tableId } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}${query}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("Airtable request failed.");
      error.status = response.status;
      error.details = data.error?.type;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function applicationExists(email) {
  const formula = `LOWER({School Email})="${email}"`;
  const query = `?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}&fields%5B%5D=${FIELD.schoolEmail}`;
  const data = await airtableRequest(query);
  return Array.isArray(data.records) && data.records.length > 0;
}

function applicationId(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `CT-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function createApplication(value, now = new Date()) {
  const timestamp = now.toISOString();
  const fields = {
    [FIELD.applicationId]: applicationId(now),
    [FIELD.submittedAt]: timestamp,
    [FIELD.formVersion]: "native-2026-09-v2",
    [FIELD.firstName]: value.firstName,
    [FIELD.lastName]: value.lastName,
    [FIELD.schoolEmail]: value.schoolEmail,
    [FIELD.mobilePhone]: value.mobilePhone,
    [FIELD.university]: value.university,
    [FIELD.campusCity]: value.campusCity,
    [FIELD.academicLevel]: value.academicLevel,
    [FIELD.gradMonth]: value.gradMonth,
    [FIELD.gradYear]: value.gradYear,
    [FIELD.birthYear]: value.birthYear,
    [FIELD.academicArea]: value.academicArea,
    [FIELD.livingSituation]: value.livingSituation,
    [FIELD.greekLife]: value.greekLife,
    [FIELD.studentAthlete]: value.studentAthlete,
    [FIELD.studentBackgrounds]: value.studentBackgrounds,
    [FIELD.gender]: value.gender,
    [FIELD.raceEthnicity]: value.raceEthnicity,
    [FIELD.employmentStatus]: value.employmentStatus,
    [FIELD.devices]: value.devices,
    [FIELD.productsActivities]: value.productsActivities,
    [FIELD.availability]: value.availability,
    [FIELD.recordingWillingness]: value.recordingWillingness,
    [FIELD.paidResearchBefore]: value.paidResearchBefore,
    [FIELD.acquisitionChannel]: value.acquisitionChannel,
    [FIELD.confirmations]: CONFIRMATIONS,
    [FIELD.consentVersion]: "student-intake-2026-09-07",
    [FIELD.consentAcceptedAt]: timestamp,
    [FIELD.sourceCode]: value.sourceCode || "website",
    [FIELD.applicationUrl]: value.applicationUrl || "https://campustakes.com/students",
    [FIELD.emailStatus]: "Verified",
    [FIELD.emailVerifiedAt]: timestamp,
    [FIELD.phoneStatus]: "Verified",
    [FIELD.phoneVerifiedAt]: timestamp,
    [FIELD.enrollmentStatus]: "Pending evidence",
    [FIELD.phoneScreenStatus]: "Not scheduled",
    [FIELD.reviewStatus]: "Needs verification",
    [FIELD.major]: value.major,
  };
  if (value.otherInstitution) fields[FIELD.otherInstitution] = value.otherInstitution;
  if (value.acquisitionDetail) fields[FIELD.acquisitionDetail] = value.acquisitionDetail;
  if (value.smsConsent) fields[FIELD.smsConsent] = [SMS_CONSENT];

  const data = await airtableRequest("", {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }], typecast: false }),
  });
  return data.records?.[0];
}

module.exports = { FIELD, applicationExists, createApplication };
