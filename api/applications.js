const crypto = require("node:crypto");
const { clientIp, json, readBody, requirePost } = require("./_lib/http");
const { FIELD, applicationExists, createApplication, findApplication } = require("./_lib/airtable");
const { authorizeBot } = require("./_lib/bot");
const { claim, consume, release } = require("./_lib/limit");
const { verifyVerification } = require("./_lib/verification-token");
const { validateApplication } = require("./_lib/validation");

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Send a valid application." });
  if (body.website) return json(res, 200, { submitted: true });

  const { errors, value } = validateApplication(body);
  if (Object.keys(errors).length) {
    return json(res, 400, { error: "Check the highlighted answers and try again.", fields: errors });
  }

  if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))) return json(res, 400, { error: "Reload this form to start a valid request." });
  value.requestId = body.requestId;
  try {
    const ip = clientIp(req);
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 20);
    const rate = await consume(`application:${ipHash}`, 60, 10 * 60 * 1000);
    if (!rate.allowed) {
      res.setHeader("Retry-After", String(rate.retryAfter));
      return json(res, 429, { error: "Too many applications attempted. Please wait and try again." });
    }
    const bot = await authorizeBot(body, ip);
    if (!bot.ok) return json(res, bot.status, { error: bot.error });
    const emailVerified = verifyVerification(body.emailVerificationToken, "email", value.schoolEmail);
    const phoneVerified = verifyVerification(body.phoneVerificationToken, "sms", value.mobilePhone);
    if (!emailVerified || !phoneVerified) {
      return json(res, 400, {
        error: "Verify both your school email and phone number before applying.",
        fields: {
          ...(!emailVerified ? { schoolEmail: "Verify this school email again." } : {}),
          ...(!phoneVerified ? { mobilePhone: "Verify this phone number again." } : {}),
        },
      });
    }
    if (value.requestId) {
      const existing = await findApplication(value.requestId);
      if (existing) {
        if (existing.fields[FIELD.schoolEmail]?.toLowerCase() !== value.schoolEmail) return json(res, 409, { error: "Start a new application by reloading this page." });
        return json(res, 200, { submitted: true });
      }
    }
    const applicationKey = crypto.createHash("sha256").update(value.schoolEmail).digest("hex");
    if (!(await claim(applicationKey))) return json(res, 409, { error: "This application is already being processed." });
    if (value.requestId && !(await claim('application-request:' + value.requestId))) {
      await release(applicationKey);
      return json(res, 409, { error: "This application is being processed. Please retry in two minutes." });
    }
    let writeAttempted = false;
    try {
      if (await applicationExists(value.schoolEmail)) {
        return json(res, 409, { error: "An application was received for this school email in the last 24 hours. For a correction today, email hello@campustakes.com; you can submit a profile refresh after 24 hours." });
      }
      writeAttempted = true;
      await createApplication(value);
      return json(res, 201, { submitted: true });
    } finally {
      // A timed-out write may have succeeded. Keep its claim until expiry;
      // the stable request ID lets a later retry acknowledge the saved record.
      if (!writeAttempted) {
        try { await release(applicationKey); if (value.requestId) await release('application-request:' + value.requestId); }
        catch (releaseError) { console.error("application lock release failed", { name: releaseError.name }); }
      }
    }
  } catch (error) {
    console.error("application submission failed", { status: error.status, details: error.details, name: error.name });
    return json(res, 503, { error: "Your application could not be saved right now. Your answers are still on this page—please try again shortly." });
  }
};
