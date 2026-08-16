// Reads js/data.js, finds the newest tracked release date, and reports
// via $GITHUB_OUTPUT whether it looks stale (older than STALE_DAYS).
// This does NOT fetch anything external — it only judges how old the
// hand-curated dataset itself is, as a nudge to go check for new releases.
import fs from 'node:fs';
import vm from 'node:vm';

const STALE_DAYS = 30;

function sortDate(d) {
  if (d.length === 4) return d + '-00-00';
  if (d.length === 7) return d + '-00';
  return d;
}

// `const`/`let` at vm top-level don't attach to the sandbox object (only `var`
// does), so rewrite the one declaration we need before running it.
const src = fs
  .readFileSync(new URL('../js/data.js', import.meta.url), 'utf8')
  .replace('const DATA', 'var DATA');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const DATA = sandbox.DATA;

if (!Array.isArray(DATA) || DATA.length === 0) {
  throw new Error('Could not read DATA from js/data.js');
}

const latest = DATA.reduce((max, r) => (sortDate(r.d) > sortDate(max.d) ? r : max), DATA[0]);
const latestDate = new Date(sortDate(latest.d));
const daysSince = Math.floor((Date.now() - latestDate.getTime()) / 86400000);
const stale = daysSince > STALE_DAYS;

console.log(`Newest tracked release: "${latest.t}" (${latest.d}), ${daysSince} day(s) ago.`);
console.log(stale ? `Older than ${STALE_DAYS} days — flagging for review.` : 'Still within freshness window.');

const out = process.env.GITHUB_OUTPUT;
if (out) {
  fs.appendFileSync(out, [
    `stale=${stale}`,
    `latest_title=${latest.t}`,
    `latest_date=${latest.d}`,
    `days_since=${daysSince}`,
  ].join('\n') + '\n');
}
