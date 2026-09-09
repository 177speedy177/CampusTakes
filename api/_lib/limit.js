const buckets = new Map();
const claims = new Map();

function cleanEnvironmentValue(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function redisConfig() {
  const url = cleanEnvironmentValue(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnvironmentValue(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (Boolean(url) !== Boolean(token)) throw new Error("Both Upstash Redis REST variables are required.");
  if (!url || !token) return null;
  let parsed;
  try { parsed = new URL(url); }
  catch {
    const error = new Error("Upstash REST URL is invalid.");
    error.code = "UPSTASH_URL_INVALID";
    throw error;
  }
  if (parsed.protocol !== "https:") {
    const error = new Error("Upstash REST URL must use HTTPS.");
    error.code = "UPSTASH_URL_NOT_HTTPS";
    throw error;
  }
  return { url: url.replace(/\/$/, ""), token };
}

function hosted() {
  return Boolean(process.env.VERCEL_ENV || process.env.NODE_ENV === "production");
}

async function command(values) {
  const config = redisConfig();
  if (!config) {
    if (hosted()) throw new Error("Durable rate limiting is not configured.");
    return undefined;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(values),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const error = new Error("Durable rate-limit request failed.");
      error.code = response.ok ? "UPSTASH_API_ERROR" : "UPSTASH_HTTP_ERROR";
      error.status = response.status;
      throw error;
    }
    return body.result;
  } finally { clearTimeout(timeout); }
}

function localConsume(key, limit, windowMs) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

async function consume(key, limit, windowMs) {
  const redisKey = `ct:rate:${key}`;
  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}";
  const result = await command(["EVAL", script, "1", redisKey, String(windowMs)]);
  if (result === undefined) return localConsume(redisKey, limit, windowMs);
  const count = Number(result?.[0]);
  const ttl = Math.max(0, Number(result?.[1]) || windowMs);
  return { allowed: count <= limit, retryAfter: count <= limit ? 0 : Math.ceil(ttl / 1000) };
}

async function claim(key, ttlSeconds = 120) {
  const redisKey = `ct:claim:${key}`;
  const result = await command(["SET", redisKey, "1", "NX", "EX", String(ttlSeconds)]);
  if (result !== undefined) return result === "OK";
  const now = Date.now();
  const expiry = claims.get(redisKey) || 0;
  if (expiry > now) return false;
  claims.set(redisKey, now + ttlSeconds * 1000);
  return true;
}

async function release(key) {
  const redisKey = `ct:claim:${key}`;
  const result = await command(["DEL", redisKey]);
  if (result === undefined) claims.delete(redisKey);
}

module.exports = { claim, consume, release };
