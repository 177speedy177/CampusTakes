const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const studyRequestHandler = require("../api/study-requests");
const { validateStudyRequest } = require("../api/study-requests");
const { FIELD, createStudyRequest } = require("../api/_lib/study-requests");

const valid = {
  clientName: "Sandra Lee",
  company: "Good Research",
  workEmail: "sandra@goodresearch.com",
  targetDescription: "Undergraduate students who use a budgeting app every week.",
  participantCount: "12",
  incentiveBudget: "60",
  format: "Interview",
  timing: "Sessions during the week of October 12",
};

test("client request validation preserves the useful study details", () => {
  const result = validateStudyRequest(valid);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.participantCount, 12);
  assert.equal(result.value.incentiveBudget, 60);
  assert.equal(result.value.workEmail, "sandra@goodresearch.com");
});

test("client request validation accepts a personal email but rejects malformed study details", () => {
  const result = validateStudyRequest({ ...valid, workEmail: "person@gmail.com", participantCount: "0", format: "Other", targetDescription: "students" });
  assert.equal(result.errors.workEmail, undefined);
  assert.ok(result.errors.participantCount);
  assert.ok(result.errors.format);
  assert.ok(result.errors.targetDescription);
});

test("client request validation rejects a malformed email", () => {
  const result = validateStudyRequest({ ...valid, workEmail: "not-an-email" });
  assert.ok(result.errors.workEmail);
});

test("study request Airtable payload maps into the existing table without typecasting", async () => {
  process.env.AIRTABLE_TOKEN = "test-token";
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ records: [{ id: "recStudyRequest01" }] }) };
  };
  try {
    await createStudyRequest(validateStudyRequest(valid).value);
    const body = JSON.parse(request.options.body);
    assert.match(request.url, /tbldhDHVaU6cmNIrs$/);
    assert.equal(body.typecast, false);
    assert.equal(body.records[0].fields[FIELD.clientName], "Sandra Lee");
    assert.equal(body.records[0].fields[FIELD.participantCount], 12);
    assert.equal(body.records[0].fields[FIELD.status], "New");
  } finally {
    global.fetch = originalFetch;
    delete process.env.AIRTABLE_TOKEN;
  }
});

test("client request endpoint writes a validated request", async () => {
  process.env.AIRTABLE_TOKEN = "test-token";
  delete process.env.TURNSTILE_SITE_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ records: [{ id: "recStudyRequest02" }] }) });
  let statusCode;
  let responseBody;
  const req = {
    method: "POST",
    headers: { origin: "https://campustakes.com", "content-type": "application/json", "x-forwarded-for": "198.51.100.44" },
    body: valid,
  };
  const res = {
    setHeader() {},
    status(value) { statusCode = value; return this; },
    json(value) { responseBody = value; return this; },
  };
  try {
    await studyRequestHandler(req, res);
    assert.equal(statusCode, 201);
    assert.deepEqual(responseBody, { submitted: true });
  } finally {
    global.fetch = originalFetch;
    delete process.env.AIRTABLE_TOKEN;
  }
});

test("research page uses the native client intake and no Tally embed", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "research.html"), "utf8");
  assert.match(html, /id="client-request-form"/);
  assert.match(html, /name="targetDescription"/);
  assert.match(html, /name="participantCount"/);
  assert.match(html, /client-request\.js/);
  assert.doesNotMatch(html, /tally\.so|typeform-clients/);
});
