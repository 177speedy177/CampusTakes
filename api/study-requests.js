const crypto = require("node:crypto");
const { authorizeBot } = require("./_lib/bot");
const { clientIp, json, readBody, requirePost } = require("./_lib/http");
const { consume, claim } = require("./_lib/limit");
const { FIELD, createStudyRequest, findStudyRequest } = require("./_lib/study-requests");

const FORMATS = new Set(["Interview", "Usability", "Survey"]);

function text(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\r\n?/g, "\n").slice(0, max);
}

function validateStudyRequest(body) {
  const errors = {};
  const workEmail = text(body.workEmail, 254).toLowerCase();
  const participantCount = Number(body.participantCount);
  const incentiveText = text(String(body.incentiveBudget ?? ""), 20);
  const incentiveBudget = incentiveText === "" ? null : Number(incentiveText);
  const value = {
    clientName: text(body.clientName, 120),
    company: text(body.company, 160),
    workEmail,
    targetDescription: text(body.targetDescription, 2500),
    participantCount,
    incentiveBudget,
    format: text(body.format, 40),
    timing: text(body.timing, 500),
  };

  if (value.clientName.length < 2) errors.clientName = "Enter your name.";
  if (value.company.length < 2) errors.company = "Enter your organization.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
    errors.workEmail = "Enter a valid email.";
  }
  if (value.targetDescription.length < 10) {
    errors.targetDescription = "Briefly describe the students you need.";
  }
  if (!Number.isInteger(participantCount) || participantCount < 1 || participantCount > 1000) {
    errors.participantCount = "Enter a participant count between 1 and 1,000.";
  }
  if (!FORMATS.has(value.format)) errors.format = "Choose a study format.";
  if (value.timing.length < 2) errors.timing = "Tell us when you need participants.";
  if (incentiveBudget !== null && (!Number.isFinite(incentiveBudget) || incentiveBudget < 0 || incentiveBudget > 10000)) {
    errors.incentiveBudget = "Enter a per-participant incentive between $0 and $10,000, or leave it blank.";
  }
  return { errors, value };
}

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Send a valid study request." });
  if (body.website) return json(res, 201, { submitted: true });

  const { errors, value } = validateStudyRequest(body);
  if (Object.keys(errors).length) {
    return json(res, 400, { error: "Check the highlighted answers and try again.", fields: errors });
  }

  if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))) return json(res, 400, { error: "Reload this form to start a valid request." });
  value.requestId = body.requestId;
  try {
    const ip = clientIp(req);
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 20);
    const rate = await consume(`study-request:${ipHash}`, 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      res.setHeader("Retry-After", String(rate.retryAfter));
      return json(res, 429, { error: "Too many requests were submitted. Please wait and try again." });
    }
    const bot = await authorizeBot(body, ip);
    if (!bot.ok) return json(res, bot.status, { error: bot.error });
    if (value.requestId) {
      const existing = await findStudyRequest(value.requestId);
      if (existing) {
        if (existing.fields[FIELD.email]?.toLowerCase() !== value.workEmail) return json(res, 409, { error: "Start a new request by reloading this page." });
        return json(res, 200, { submitted: true });
      }
    }
    // Serialize retries. Upsert preserves one durable request after a lost response.
    if (value.requestId && !(await claim('study:' + value.requestId))) {
      res.setHeader("Retry-After", "120");
      return json(res, 409, { error: "This request is being processed. Wait two minutes before retrying; your answers are preserved." });
    }
    await createStudyRequest(value);
    return json(res, 201, { submitted: true });
  } catch (error) {
    console.error("study request submission failed", { status: error.status, details: error.details, name: error.name });
    return json(res, 503, {
      error: "We could not save your request right now. Your answers are still on this page—please try again or email hello@campustakes.com.",
    });
  }
};

module.exports.validateStudyRequest = validateStudyRequest;
