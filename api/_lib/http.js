const DEFAULT_ORIGINS = new Set([
  "https://campustakes.com",
  "https://www.campustakes.com",
]);

function setHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function json(res, status, body) {
  setHeaders(res);
  return res.status(status).json(body);
}

function readBody(req) {
  const contentLength = Number(req.headers?.["content-length"] || 0);
  if (contentLength > 50_000) return null;
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    try { return JSON.stringify(req.body).length <= 50_000 ? req.body : null; } catch { return null; }
  }
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > 50_000) return null;
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...configured]);
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return !process.env.VERCEL_ENV && process.env.NODE_ENV !== "production";
  if (allowedOrigins().has(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.protocol === "http:" || url.protocol === "https:")
    );
  } catch {
    return false;
  }
}

function requirePost(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    json(res, 405, { error: "Method not allowed." });
    return false;
  }
  if (!isAllowedOrigin(req)) {
    json(res, 403, { error: "Request origin is not allowed." });
    return false;
  }
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    json(res, 415, { error: "Content-Type must be application/json." });
    return false;
  }
  return true;
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

module.exports = { clientIp, json, readBody, requirePost };
