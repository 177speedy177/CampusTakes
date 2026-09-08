const crypto = require("node:crypto");
const { clientIp, json, readBody, requirePost } = require("./_lib/http");
const { consume } = require("./_lib/limit");
const { signVerification } = require("./_lib/verification-token");
const { checkVerification } = require("./_lib/twilio-verify");
const { isEduEmail, normalizeEmail, normalizePhone } = require("./_lib/validation");

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Send a valid request." });
  if (body.website) return json(res, 400, { error: "Unable to verify." });

  const channel = body.channel;
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if ((channel !== "email" && channel !== "sms") || !/^\d{4,10}$/.test(code)) {
    return json(res, 400, { error: "Enter the verification code you received." });
  }
  const contact = channel === "email" ? normalizeEmail(body.value) : normalizePhone(body.value);
  if ((channel === "email" && !isEduEmail(contact)) || (channel === "sms" && !contact)) {
    return json(res, 400, { error: "The contact information is not valid." });
  }

  const ipHash = crypto.createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 20);
  const rate = consume(`verify-check:${channel}:${ipHash}`, 10, 10 * 60 * 1000);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    return json(res, 429, { error: "Too many attempts. Please wait a few minutes and try again." });
  }

  try {
    const result = await checkVerification(contact, code);
    if (result.status !== "approved") {
      return json(res, 400, { error: "That code is incorrect or expired." });
    }
    return json(res, 200, {
      verified: true,
      token: signVerification(channel, contact),
      contact,
    });
  } catch (error) {
    if (error.code === 60202 || error.code === 20404 || error.status === 404) {
      return json(res, 400, { error: "That code is incorrect or expired. Request a new one if needed." });
    }
    if (error.code === 60203 || error.status === 429) {
      return json(res, 429, { error: "Too many attempts. Please wait before trying again." });
    }
    console.error("verification-check failed", { status: error.status, code: error.code, name: error.name });
    return json(res, 503, { error: "Verification is temporarily unavailable. Please try again shortly." });
  }
};
