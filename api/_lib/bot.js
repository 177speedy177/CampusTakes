const crypto = require("node:crypto");

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const PROOF_TTL_SECONDS = 15 * 60;

function configured() {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

function isHosted() {
  return Boolean(process.env.VERCEL_ENV || process.env.NODE_ENV === "production");
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "unknown")).digest("base64url");
}

function signingSecret() {
  const value = process.env.VERIFICATION_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("VERIFICATION_TOKEN_SECRET must contain at least 32 characters.");
  return value;
}

function signBotProof(ip, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    purpose: "student-intake",
    ip: digest(ip),
    iat: nowSeconds,
    exp: nowSeconds + PROOF_TTL_SECONDS,
    nonce: crypto.randomBytes(12).toString("base64url"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", signingSecret()).update(`bot.${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyBotProof(token, ip, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || token.length > 2048) return false;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return false;
  const expected = crypto.createHmac("sha256", signingSecret()).update(`bot.${payload}`).digest();
  let actual;
  try { actual = Buffer.from(supplied, "base64url"); } catch { return false; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value.v === 1 && value.purpose === "student-intake" && value.ip === digest(ip)
      && Number.isInteger(value.iat) && Number.isInteger(value.exp)
      && value.iat <= nowSeconds + 60 && value.exp >= nowSeconds;
  } catch { return false; }
}

function allowedHostname(hostname) {
  const configuredHosts = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "campustakes.com,www.campustakes.com")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return configuredHosts.includes(String(hostname || "").toLowerCase());
}

async function verifyChallenge(token, ip) {
  if (!configured()) {
    if (isHosted()) return { ok: false, status: 503, error: "Security verification is not configured." };
    return { ok: true, localBypass: true };
  }
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) {
    return { ok: false, status: 400, error: "Complete the security check and try again." };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    const errorCodes = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
    if (errorCodes.includes("missing-input-secret") || errorCodes.includes("invalid-input-secret")) {
      console.error("Turnstile configuration rejected", { errorCodes });
      return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
    }
    if (!response.ok || !result.success || result.action !== "student-intake" || !allowedHostname(result.hostname)) {
      return { ok: false, status: 400, error: "The security check expired or was not accepted. Please try again." };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
  } finally { clearTimeout(timeout); }
}

async function authorizeBot(body, ip) {
  try {
    if (body?.botProof && verifyBotProof(body.botProof, ip)) return { ok: true, proof: body.botProof };
    const challenge = await verifyChallenge(body?.botChallenge, ip);
    if (!challenge.ok) return challenge;
    return { ok: true, proof: challenge.localBypass ? "" : signBotProof(ip) };
  } catch {
    return { ok: false, status: 503, error: "Security verification is temporarily unavailable." };
  }
}

module.exports = { authorizeBot, configured, signBotProof, verifyBotProof, verifyChallenge };
