const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { isEduEmail, normalizePhone, validateApplication } = require("../api/_lib/validation");
const { signVerification, verifyVerification } = require("../api/_lib/verification-token");
const { signBotProof, verifyBotProof, verifyChallenge } = require("../api/_lib/bot");
const { requirePost } = require("../api/_lib/http");
const { claim, consume, release } = require("../api/_lib/limit");
const { FIELD, createApplication } = require("../api/_lib/airtable");
const applicationHandler = require("../api/applications");

const validApplication = {
  firstName: "Jo",
  lastName: "Student",
  schoolEmail: "jo@psu.edu",
  mobilePhone: "(814) 555-0123",
  university: "Pennsylvania State University",
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

test("bot proof is signed, short-lived, and bound to the requester IP", () => {
  process.env.VERIFICATION_TOKEN_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  const proof = signBotProof("203.0.113.4", 1_000);
  assert.equal(verifyBotProof(proof, "203.0.113.4", 1_001), true);
  assert.equal(verifyBotProof(proof, "203.0.113.5", 1_001), false);
  assert.equal(verifyBotProof(proof, "203.0.113.4", 1_901), false);
});

test("Turnstile validation requires the expected action and hostname", async () => {
  const saved = {
    site: process.env.TURNSTILE_SITE_KEY,
    secret: process.env.TURNSTILE_SECRET_KEY,
    hosts: process.env.TURNSTILE_ALLOWED_HOSTNAMES,
  };
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SITE_KEY = "public-test-key";
  process.env.TURNSTILE_SECRET_KEY = "private-test-key";
  delete process.env.TURNSTILE_ALLOWED_HOSTNAMES;
  let result = { success: true, action: "student-intake", hostname: "campustakes.com" };
  global.fetch = async () => ({ ok: true, json: async () => result });
  try {
    assert.deepEqual(await verifyChallenge("challenge-token", "203.0.113.4"), { ok: true });
    result = { success: true, action: "different-action", hostname: "campustakes.com" };
    assert.equal((await verifyChallenge("challenge-token", "203.0.113.4")).ok, false);
    result = { success: true, action: "student-intake", hostname: "attacker.example" };
    assert.equal((await verifyChallenge("challenge-token", "203.0.113.4")).ok, false);
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries({
      TURNSTILE_SITE_KEY: saved.site,
      TURNSTILE_SECRET_KEY: saved.secret,
      TURNSTILE_ALLOWED_HOSTNAMES: saved.hosts,
    })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("production POSTs require an allowed origin and JSON content type", () => {
  const saved = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  const run = (headers) => {
    let status;
    const res = {
      setHeader() {},
      status(value) { status = value; return this; },
      json() { return this; },
    };
    const allowed = requirePost({ method: "POST", headers }, res);
    return { allowed, status };
  };
  try {
    assert.deepEqual(run({ "content-type": "application/json" }), { allowed: false, status: 403 });
    assert.deepEqual(run({ origin: "https://campustakes.com", "content-type": "text/plain" }), { allowed: false, status: 415 });
    assert.deepEqual(run({ origin: "https://campustakes.com", "content-type": "application/json; charset=utf-8" }), { allowed: true, status: undefined });
  } finally {
    if (saved === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = saved;
  }
});

test("submission claim prevents concurrent duplicate processing", async () => {
  assert.equal(await claim("same-application", 10), true);
  assert.equal(await claim("same-application", 10), false);
  await release("same-application");
  assert.equal(await claim("same-application", 10), true);
  await release("same-application");
});

test("durable limiter sends atomic Redis commands and respects a failed NX claim", async () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = global.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-test-token";
  const commands = [];
  let result = [1, 60_000];
  global.fetch = async (url, options) => {
    commands.push({ url, options });
    return { ok: true, json: async () => ({ result }) };
  };
  try {
    assert.deepEqual(await consume("test-key", 2, 60_000), { allowed: true, retryAfter: 0 });
    assert.equal(JSON.parse(commands[0].options.body)[0], "EVAL");
    result = null;
    assert.equal(await claim("claimed-key"), false);
    assert.deepEqual(JSON.parse(commands[1].options.body).slice(0, 2), ["SET", "ct:claim:claimed-key"]);
  } finally {
    global.fetch = originalFetch;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});

test("Airtable payload marks control verified but independent enrollment not reviewed", async () => {
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
    assert.equal(fields[FIELD.enrollmentStatus], "Not reviewed");
    assert.equal(fields[FIELD.phoneScreenStatus], "Not scheduled");
    assert.equal(fields[FIELD.reviewStatus], "Ready for review");
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
  assert.match(html, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(html, /id="turnstile-widget"/);
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
  const req = { method: "POST", headers: { origin: "https://campustakes.com", "content-type": "application/json" }, body };
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

test("optional matching answers can be blank but mutually exclusive answers cannot be combined", () => {
  const sparse = {...validApplication, gender:"", employmentStatus:"", livingSituation:"", greekLife:"", studentAthlete:"", studentBackgrounds:[], raceEthnicity:[], devices:[], productsActivities:[]};
  assert.deepEqual(validateApplication(sparse).errors, {});
  assert.ok(validateApplication({...validApplication, studentBackgrounds:["None of these", "Transfer student"]}).errors.studentBackgrounds);
  assert.ok(validateApplication({...validApplication, raceEthnicity:["White", "Prefer not to say"]}).errors.raceEthnicity);
  assert.ok(validateApplication({...validApplication, productsActivities:["Gaming", "Gaming"]}).errors.productsActivities);
});
