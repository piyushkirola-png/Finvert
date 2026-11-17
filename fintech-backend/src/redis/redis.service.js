const { getRedisClient } = require("./redis.config");

async function cacheAside(key, ttl, fn) {
  try {
    const redis = await getRedisClient();
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
    const value = await fn();
    await redis.setEx(key, ttl, JSON.stringify(value));
    return value;
  } catch (e) {
    console.error("[Redis cacheAside]", e.message);
    return fn();
  }
}

function buildKey(prefix, filters) {
  const clean = {};
  for (const k of Object.keys(filters).sort()) {
    const v = filters[k];
    if (v === undefined || v === null || v === "") continue;
    clean[k] = v;
  }
  return `${prefix}:${JSON.stringify(clean)}`;
}

async function invalidate(prefix) {
  if (!prefix || typeof prefix !== "string") {
    console.warn("[Redis invalidate] no prefix provided, skipping");
    return;
  }

  try {
    const redis = await getRedisClient();

    for await (const batch of redis.scanIterator({
      MATCH: `${prefix}:*`,
      COUNT: 100,
    })) {
      const keys = Array.isArray(batch) ? batch : [batch];
      const clean = keys.filter((k) => typeof k === "string" && k.length > 0);
      if (clean.length > 0) {
        await redis.del(clean);
      }
    }
  } catch (e) {
    console.error("[Redis invalidate]", e.message);
  }
}

module.exports = { cacheAside, buildKey, invalidate };
