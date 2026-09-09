const { json } = require("./_lib/http");
const { configured } = require("./_lib/bot");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed." });
  }
  return json(res, 200, {
    enabled: configured(),
    siteKey: configured() ? process.env.TURNSTILE_SITE_KEY : "",
  });
};
