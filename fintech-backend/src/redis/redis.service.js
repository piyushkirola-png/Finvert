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
  try {
    const redis = await getRedisClient();
    for await (const key of redis.scanIterator({ MATCH: `${prefix}:*`, COUNT: 100 })) {
      if (key) await redis.del(key);
    }
  } catch (e) {
    console.error("[Redis invalidate]", e.message);
  }
}

module.exports = { cacheAside, buildKey, invalidate };