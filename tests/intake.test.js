const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { isEduEmail, normalizePhone, validateApplication } = require("../api/_lib/validation");
const { signVerification, verifyVerification } = require("../api/_lib/verification-token");
const { FIELD, createApplication } = require("../api/_lib/airtable");
const applicationHandler = require("../api/applications");

const validApplication = {
  firstName: "Jo",
  lastName: "Student",
  schoolEmail: "jo@psu.edu",
  mobilePhone: "(814) 555-0123",
  university: "Penn State",
  otherInstitution: "",
  campusCity: "University Park",
  academicLevel: "Sophomore",
  gradMonth: "May",
  gradYear: "2029",
  academicArea: "Engineering",
  major: "Biomedical Engineering",
  birthYear: "2006",
  livingSituation: "On-campus housing",
  greekLife: "No",
  studentAthlete: "No",
  studentBackgrounds: ["None of these"],
  gender: "Prefer not to say",
  raceEthnicity: ["Prefer not to say"],
  employmentStatus: "Part-time",
  devices: ["iPhone", "Windows computer"],
  productsActivities: ["Study or AI tools"],
  availability: ["Weekday evenings"],
  recordingWillingness: "It depends on the study",
  paidResearchBefore: "Never",
  acquisitionChannel: "Friend or referral",
  acquisitionDetail: "",
  confirmAgeEnrollment: true,
  confirmAccuracy: true,
  emailConsent: true,
  smsConsent: false,
  sourceCode: "test",
  applicationUrl: "http://localhost:3000/students",
};

test("school email must end exactly in .edu", () => {
  assert.equal(isEduEmail("student@psu.edu"), true);
  assert.equal(isEduEmail("STUDENT@PSU.EDU"), true);
  assert.equal(isEduEmail("student@gmail.com"), false);
  assert.equal(isEduEmail("student@university.edu.uk"), false);
  assert.equal(isEduEmail("student@school.edy"), false);
  assert.equal(isEduEmail("student@notedu.example.com"), false);
});

test("phone normalization supports US input and explicit international E.164", () => {
  assert.equal(normalizePhone("(814) 555-0123"), "+18145550123");
  assert.equal(normalizePhone("1-814-555-0123"), "+18145550123");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("123"), "");
});

test("complete application validates and is normalized", () => {
  const result = validateApplication(validApplication);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.schoolEmail, "jo@psu.edu");
  assert.equal(result.value.mobilePhone, "+18145550123");
  assert.equal(result.value.birthYear, 2006);
});

test("source detail is required only for channels where it is useful", () => {
  assert.deepEqual(validateApplication(validApplication).errors, {});
  const missing = validateApplication({ ...validApplication, acquisitionChannel: "Student organization or club" });
  assert.equal(missing.errors.acquisitionDetail, "Tell us which organization, professor, platform, or source.");
  const supplied = validateApplication({
    ...validApplication,
    acquisitionChannel: "Student organization or club",
    acquisitionDetail: "Penn State Marketing Association",
  });
  assert.deepEqual(supplied.errors, {});
  assert.equal(supplied.value.acquisitionDetail, "Penn State Marketing Association");
});

test("verification proof is bound to channel, contact, signature, and expiry", () => {
  process.env.VERIFICATION_TOKEN_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  const token = signVerification("email", "jo@psu.edu", 1_000);
  assert.equal(verifyVerification(token, "email", "jo@psu.edu", 1_001), true);
  assert.equal(verifyVerification(token, "email", "other@psu.edu", 1_001), false);
  assert.equal(verifyVerification(token, "sms", "jo@psu.edu", 1_001), false);
  assert.equal(verifyVerification(`${token}x`, "email", "jo@psu.edu", 1_001), false);
  assert.equal(verifyVerification(token, "email", "jo@psu.edu", 2_801), false);
});

test("Airtable payload marks control verified but enrollment pending", async () => {
  process.env.AIRTABLE_TOKEN = "test-token";
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ records: [{ id: "recTest" }] }) };
  };
  try {
    const value = validateApplication(validApplication).value;
    await createApplication(value, new Date("2026-09-07T12:00:00.000Z"));
    const body = JSON.parse(request.options.body);
    const fields = body.records[0].fields;
    assert.equal(fields[FIELD.emailStatus], "Verified");
    assert.equal(fields[FIELD.phoneStatus], "Verified");
    assert.equal(fields[FIELD.enrollmentStatus], "Pending evidence");
    assert.equal(fields[FIELD.phoneScreenStatus], "Not scheduled");
    assert.equal(fields[FIELD.reviewStatus], "Needs verification");
    assert.equal(fields[FIELD.schoolEmail], "jo@psu.edu");
    assert.equal(fields[FIELD.smsConsent], undefined);
    assert.equal(fields[FIELD.acquisitionDetail], undefined);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Airtable SMS consent uses the existing multiple-select option", async () => {
  process.env.AIRTABLE_TOKEN = "test-token";
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ records: [{ id: "recTest" }] }) };
  };
  try {
    const value = validateApplication({ ...validApplication, smsConsent: true }).value;
    await createApplication(value, new Date("2026-09-07T12:00:00.000Z"));
    const fields = JSON.parse(request.options.body).records[0].fields;
    assert.deepEqual(fields[FIELD.smsConsent], ["I agree to receive recurring automated text messages from Campus Takes at the mobile number provided."]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("student page contains the native form and no Jotform embed", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "students.html"), "utf8");
  assert.match(html, /id="student-application"/);
  assert.match(html, /name="schoolEmail"/);
  assert.match(html, /name="mobilePhone"/);
  assert.match(html, /name="smsConsent"/);
  assert.doesNotMatch(html, /form\.jotform\.com|JotFormIFrame|jotformEmbedHandler/);
});

test("application endpoint requires both proofs and writes one new record", async () => {
  process.env.AIRTABLE_TOKEN = "test-token";
  process.env.VERIFICATION_TOKEN_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (!options.method) return { ok: true, json: async () => ({ records: [] }) };
    return { ok: true, json: async () => ({ records: [{ id: "recTest" }] }) };
  };
  const body = {
    ...validApplication,
    emailVerificationToken: signVerification("email", "jo@psu.edu"),
    phoneVerificationToken: signVerification("sms", "+18145550123"),
  };
  const req = { method: "POST", headers: { origin: "https://campustakes.com" }, body };
  let status;
  let responseBody;
  const res = {
    setHeader() {},
    status(value) { status = value; return this; },
    json(value) { responseBody = value; return value; },
  };
  try {
    await applicationHandler(req, res);
    assert.equal(status, 201);
    assert.deepEqual(responseBody, { submitted: true });
    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /filterByFormula=/);
    assert.equal(requests[1].options.method, "POST");
  } finally {
    global.fetch = originalFetch;
  }
});
