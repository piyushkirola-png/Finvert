const { createClient } = require("redis");
let client = null;

async function getRedisClient() {
  if (client && client.isOpen) return client;
  client = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  });
  client.on("error", (e) => console.error("[Redis]", e.message));
  await client.connect();
  return client;
}
module.exports = { getRedisClient };
