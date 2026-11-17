const fs = require("fs");
const { once } = require("events");

const pad = (n) => String(n).padStart(2, "0");

// IST is UTC+5:30 with no DST, so plain arithmetic replaces Intl (much faster)
function formatIST(date) {
  if (!date) return "";
  const d = new Date(new Date(date).getTime() + 19800000);
  const h = d.getUTCHours();
  const h12 = h % 12 || 12;
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}, ${pad(h12)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${h >= 12 ? "PM" : "AM"}`;
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (s.startsWith("=") || s.startsWith("@")) s = "'" + s; // CSV injection guard
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * fetchBatch(lastId) -> array of rows ([] = done), each row must have `id`
 * columns: [[header, row => value], ...]
 * Returns number of data rows written.
 */
async function streamCsv({ filePath, columns, fetchBatch }) {
  const out = fs.createWriteStream(filePath, { encoding: "utf8" });
  const write = async (chunk) => {
    if (!out.write(chunk)) await once(out, "drain");
  };

  let rows = 0;
  let lastId = 0;

  try {
    await write(columns.map((c) => csvCell(c[0])).join(",") + "\n");

    while (true) {
      const batch = await fetchBatch(lastId);
      if (batch.length === 0) break;

      let chunk = "";
      for (const row of batch) {
        chunk += columns.map((c) => csvCell(c[1](row))).join(",") + "\n";
      }
      await write(chunk);

      rows += batch.length;
      lastId = batch[batch.length - 1].id;
    }

    out.end();
    await once(out, "finish");
    return rows;
  } catch (err) {
    out.destroy();
    throw err;
  }
}

module.exports = { streamCsv, formatIST };
