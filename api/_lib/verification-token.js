const crypto = require("node:crypto");

const TOKEN_TTL_SECONDS = 30 * 60;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function contactDigest(value) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

function secret() {
  const value = process.env.VERIFICATION_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error("VERIFICATION_TOKEN_SECRET must contain at least 32 characters.");
  }
  return value;
}

function signVerification(channel, contact, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = {
    v: 1,
    channel,
    contact: contactDigest(contact),
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
    nonce: crypto.randomBytes(12).toString("base64url"),
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyVerification(token, channel, contact, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string") return false;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return false;
  const expectedSignature = crypto.createHmac("sha256", secret()).update(encoded).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return false;
  }
  if (actualSignature.length !== expectedSignature.length) return false;
  if (!crypto.timingSafeEqual(actualSignature, expectedSignature)) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  return Boolean(
    payload.v === 1 &&
      payload.channel === channel &&
      payload.contact === contactDigest(contact) &&
      Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) &&
      payload.iat <= nowSeconds + 60 &&
      payload.exp >= nowSeconds
  );
}

module.exports = { signVerification, verifyVerification };
