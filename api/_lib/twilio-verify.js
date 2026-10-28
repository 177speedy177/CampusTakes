function config() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid || Boolean(apiKeySid) !== Boolean(apiKeySecret)) {
    throw new Error("Twilio Verify environment variables are missing.");
  }
  if (apiKeySid && apiKeySecret) {
    return { username: apiKeySid, password: apiKeySecret, serviceSid };
  }
  if (!accountSid || !authToken) {
    throw new Error("Twilio Verify environment variables are missing.");
  }
  return { username: accountSid, password: authToken, serviceSid };
}

async function requestTwilio(path, body) {
  const { username, password, serviceSid } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
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
