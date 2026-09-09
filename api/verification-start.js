const crypto = require("node:crypto");
const { authorizeBot } = require("./_lib/bot");
const { clientIp, json, readBody, requirePost } = require("./_lib/http");
const { consume } = require("./_lib/limit");
const { startVerification } = require("./_lib/twilio-verify");
const { isEduEmail, normalizeEmail, normalizePhone } = require("./_lib/validation");

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Send a valid request." });
  if (body.website) return json(res, 200, { sent: true });

  const channel = body.channel;
  if (channel !== "email" && channel !== "sms") {
    return json(res, 400, { error: "Choose email or text verification." });
  }

  const contact = channel === "email" ? normalizeEmail(body.value) : normalizePhone(body.value);
  if (channel === "email" && !isEduEmail(contact)) {
    return json(res, 400, { error: "Please enter a valid U.S. college or university email ending in .edu." });
  }
  if (channel === "sms" && !contact) {
    return json(res, 400, { error: "Please enter a valid phone number." });
  }

  const ipHash = crypto.createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 20);
  const contactHash = crypto.createHash("sha256").update(contact).digest("hex").slice(0, 20);
  let rates;
  try {
    rates = await Promise.all([
      consume(`verify-start:${channel}:ip:${ipHash}`, 60, 10 * 60 * 1000),
      consume(`verify-start:${channel}:contact:${contactHash}`, 3, 30 * 60 * 1000),
    ]);
  }
  catch (error) {
    console.error("rate-limit unavailable", { code: error.code, status: error.status, name: error.name });
    return json(res, 503, { error: "Security controls are temporarily unavailable. Please try again shortly." });
  }
  const blockedRate = rates.find((rate) => !rate.allowed);
  if (blockedRate) {
    res.setHeader("Retry-After", String(blockedRate.retryAfter));
    return json(res, 429, { error: "Too many codes requested. Please wait a few minutes and try again." });
  }

  try {
    const bot = await authorizeBot(body, clientIp(req));
    if (!bot.ok) return json(res, bot.status, { error: bot.error });
    // Do not reveal whether a school email already exists in the applicant database.
    // The final submission can safely report a duplicate after the applicant proves ownership.
    await startVerification(channel, contact);
    return json(res, 200, { sent: true, contact, botProof: bot.proof });
  } catch (error) {
    if (error.code === 60203 || error.status === 429) {
      return json(res, 429, { error: "Too many attempts. Please wait before requesting another code." });
    }
    if (error.code === 60200 || error.status === 400) {
      return json(res, 400, { error: channel === "email" ? "That school email could not receive a code." : "That phone number could not receive a code." });
    }
    console.error("verification-start failed", { status: error.status, code: error.code, name: error.name });
    return json(res, 503, { error: "Verification is temporarily unavailable. Please try again shortly." });
  }
};
