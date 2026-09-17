// RADAR Carpentry — the private analytics page's data (17 Sep 2026). Published at /api/analytics.
//
// Beth, 17 Sep call: "we look at like the location… the bounce rate… the pages that they go to… where they spend the most
// time… the demographic". The page at /analytics is plain HTML with no numbers in it; it asks this function for them with
// the key from its own link. The key is the Vercel project setting ANALYTICS_KEY (never in the code). A wrong or missing key
// gets a 401 and nothing else.
//
// The numbers come from Google Analytics 4 (property "RADAR Carpentry"), written each morning by the Just Sorted refresh job
// (tools/radar_site_refresh.py → tools/ga4_site_report.py) into api/_data/analytics.json in this repo. Her old Wix site's
// visitor history, once she exports it, sits beside it in api/_data/analytics-history.json. Both are bundled with this
// function; neither is served as a public file.

const crypto = require('crypto');

let DATA = null;
let HISTORY = null;
try { DATA = require('./_data/analytics.json'); } catch (e) { DATA = null; }
try { HISTORY = require('./_data/analytics-history.json'); } catch (e) { HISTORY = null; }

function keyMatches(given, expected) {
  if (!expected || expected.length < 24 || typeof given !== 'string' || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if ((req.method || 'GET') !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  let given = req.query && typeof req.query.k === 'string' ? req.query.k : '';
  if (!given && req.headers && typeof req.headers['x-analytics-key'] === 'string') given = req.headers['x-analytics-key'];
  if (!keyMatches(given, process.env.ANALYTICS_KEY || '')) {
    return res.status(401).json({ ok: false, message: 'This page is private. Open it with the link you were sent.' });
  }
  return res.status(200).json({ ok: true, data: DATA, history: HISTORY });
};
