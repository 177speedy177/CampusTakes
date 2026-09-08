function config() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Twilio Verify environment variables are missing.");
  }
  return { accountSid, authToken, serviceSid };
}

async function requestTwilio(path, body) {
  const { accountSid, authToken, serviceSid } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("Twilio Verify request failed.");
      error.status = response.status;
      error.code = data.code;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function startVerification(channel, to) {
  return requestTwilio("Verifications", { To: to, Channel: channel });
}

function checkVerification(to, code) {
  return requestTwilio("VerificationCheck", { To: to, Code: code });
}

module.exports = { checkVerification, startVerification };
