// RADAR Carpentry — Kyle's one-off Instagram connection (17 Sep 2026). Published at /api/instagram-connect.
//
// Beth, 10 Sep 2026: the only thing Kyle will do is put things on Instagram. Her old Wix site held a read-only Instagram
// permission and showed his posts by itself; this is the same permission, granted to Just Sorted's own Meta registration
// instead of Wix's. Kyle opens this address once: it sends him to Instagram's Allow screen; Instagram sends him back
// here with a one-time code; this swaps the code for a 60-day read-only key, reads the account's name, and emails the key
// to Just Sorted (hello@justsorted.com.au) for the site's settings. Kyle sees a thanks page. The key never reaches the
// browser, and nothing here can post, delete, message or change anything on the account.
//
// Settings read from the Vercel project: IG_APP_ID and IG_APP_SECRET (the Instagram-specific pair of the Just Sorted app),
// RESEND_API_KEY (the same email service the enquiry form uses; sender forms@send.justsorted.com.au), IG_CONNECT_NOTIFY
// (where the key is emailed; default hello@justsorted.com.au), IG_CONNECT_REDIRECT (this address as registered on the
// Meta app; default https://www.radarcarpentry.com.au/api/instagram-connect).
//
// Zero dependencies. `create(deps)` exists so the harness can run every path with a fake fetch, clock and randomness.

const crypto = require('crypto');

const DEFAULT_REDIRECT = 'https://www.radarcarpentry.com.au/api/instagram-connect';
const DEFAULT_NOTIFY = 'hello@justsorted.com.au';
const SENDER = 'RADAR Carpentry website <forms@send.justsorted.com.au>';
const SCOPE = 'instagram_business_basic';
const STATE_COOKIE = 'ig_state';
const AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
const EXCHANGE = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';
const RESEND = 'https://api.resend.com/emails';
const SIXTY_DAYS = 5184000;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function html(title, body, extra) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>' + esc(title) + ' · RADAR Carpentry</title>' +
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1f33;color:#f4f6f8;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px;box-sizing:border-box}' +
    'main{max-width:520px}.k{color:#41B07D;font:600 .78rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}' +
    'h1{font-size:1.65rem;line-height:1.2;margin:.7rem 0 .5rem}p{font-size:1.05rem;line-height:1.55;color:#c9d2dc;margin:0 0 .6rem}' +
    'a.btn{display:inline-block;margin-top:.8rem;padding:.8rem 1.2rem;border-radius:10px;background:#41B07D;color:#0f1f33;font-weight:700;text-decoration:none}</style>' +
    '</head><body><main><div class="k">RADAR Carpentry</div><h1>' + esc(title) + '</h1><p>' + esc(body) + '</p>' + (extra || '') + '</main></body></html>';
}

function create(deps = {}) {
  const fetchFn = deps.fetch || global.fetch;
  const env = deps.env || process.env;
  const now = deps.now || (() => new Date());
  const randomState = deps.randomState || (() => crypto.randomBytes(16).toString('hex'));
  const log = deps.log || ((...a) => console.error(...a));

  function settings() {
    return {
      appId: env.IG_APP_ID || '',
      appSecret: env.IG_APP_SECRET || '',
      resendKey: env.RESEND_API_KEY || '',
      notify: env.IG_CONNECT_NOTIFY || DEFAULT_NOTIFY,
      redirect: env.IG_CONNECT_REDIRECT || DEFAULT_REDIRECT,
    };
  }

  function query(req) {
    if (req.query && typeof req.query === 'object') return req.query;
    const u = new URL(req.url || '/', 'https://localhost');
    const q = {};
    u.searchParams.forEach((v, k) => { q[k] = v; });
    return q;
  }

  function cookies(req) {
    const out = {};
    String((req.headers && req.headers.cookie) || '').split(';').forEach((p) => {
      const i = p.indexOf('=');
      if (i > 0) {
        try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { /* ignore a bad cookie */ }
      }
    });
    return out;
  }

  function describe(body, status) {
    // Meta's error messages never carry the key; URLs and bodies are never quoted
    const m = body && ((body.error && (body.error.message || body.error.type)) || body.error_message || body.error_type);
    return m ? String(m).slice(0, 160) : `Instagram answered ${status}`;
  }

  async function postForm(url, fields) {
    const r = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString() });
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch (e) { body = null; }
    if (!r.ok) throw new Error(describe(body, r.status));
    return body || {};
  }

  async function getJSON(url) {
    const r = await fetchFn(url, { method: 'GET' });
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch (e) { body = null; }
    if (!r.ok) throw new Error(describe(body, r.status));
    return body || {};
  }

  async function email(s, subject, lines) {
    if (!s.resendKey) { log('instagram-connect: RESEND_API_KEY not set, could not send:', subject); return false; }
    const text = lines.join('\n');
    const body = '<pre style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;white-space:pre-wrap">' + esc(text) + '</pre>';
    try {
      const r = await fetchFn(RESEND, { method: 'POST', headers: { Authorization: `Bearer ${s.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: SENDER, to: [s.notify], subject, text, html: body }) });
      if (!r.ok) { log('instagram-connect: email not accepted', r.status); return false; }
      return true;
    } catch (e) {
      log('instagram-connect: email failed', e && e.message);
      return false;
    }
  }

  function page(res, status, title, body, extra) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(html(title, body, extra));
  }

  function retry(s) {
    return '<a class="btn" href="' + esc(s.redirect) + '">Try again</a>';
  }

  function stamp() {
    return now().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if ((req.method || 'GET') !== 'GET') return res.status(405).send('Method not allowed');
    const s = settings();
    const q = query(req);

    if (!s.appId || !s.appSecret) {
      log('instagram-connect: IG_APP_ID / IG_APP_SECRET not set on the project');
      return page(res, 500, 'Not switched on yet', 'This link is not set up yet. Dave has been told, and will send a fresh one.');
    }

    // Instagram sends the visitor back with ?error=… when they tap Cancel
    if (q.error) {
      await email(s, `RADAR Instagram: not connected (${q.error})`, [
        `The connect link was opened but the permission was not granted (${stamp()}).`,
        `error: ${q.error}`, `reason: ${q.error_reason || '-'}`, `description: ${q.error_description || '-'}`,
        'To do: ask Kyle to open the link again and tap Allow.',
      ]);
      return page(res, 200, "Something didn't go through", "The permission wasn't granted, so nothing was connected. Dave has been told. If that was a slip, you can try again:", retry(s));
    }

    // first visit: remember a random state in a cookie and send them to Instagram's Allow screen
    if (!q.code) {
      const state = randomState();
      const u = new URL(AUTHORIZE);
      u.searchParams.set('client_id', s.appId);
      u.searchParams.set('redirect_uri', s.redirect);
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('scope', SCOPE);
      u.searchParams.set('state', state);
      res.setHeader('Set-Cookie', `${STATE_COOKIE}=${state}; Path=/api/instagram-connect; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
      res.setHeader('Location', u.toString());
      return res.status(302).send('');
    }

    // back from Instagram with a code: the state must be the one this browser was given
    const expected = cookies(req)[STATE_COOKIE] || '';
    if (!expected || expected !== String(q.state || '')) {
      await email(s, 'RADAR Instagram: connection came back without its state', [
        `A code came back to /api/instagram-connect but the browser had no matching state cookie (${stamp()}).`,
        'Usually the link was started in one browser and finished in another (for example Instagram\'s in-app browser).',
        'The visitor was shown a Try again button, which restarts the flow in the same browser. Nothing was exchanged.',
      ]);
      return page(res, 200, 'One more go', 'That link was started in a different browser than it finished in, so it could not be completed. Tap below to do it again in this one. It takes ten seconds.', retry(s));
    }

    try {
      const code = String(q.code).replace(/#_$/, '');
      const short = await postForm(EXCHANGE, { client_id: s.appId, client_secret: s.appSecret, grant_type: 'authorization_code', redirect_uri: s.redirect, code });
      if (!short.access_token) throw new Error('Instagram returned no key for the code');
      const long = await getJSON(`${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(s.appSecret)}&access_token=${encodeURIComponent(short.access_token)}`);
      if (!long.access_token) throw new Error('Instagram returned no long-lived key');
      const me = await getJSON(`${GRAPH}/me?fields=id,username,account_type,media_count&access_token=${encodeURIComponent(long.access_token)}`);
      const seconds = Number(long.expires_in) || SIXTY_DAYS;
      const expires = new Date(now().getTime() + seconds * 1000);
      const username = me.username || String(short.user_id || '');
      const isRadar = username === 'radarcarpentry';
      await email(s, `RADAR Instagram connected — ${username}`, [
        `Instagram is connected to the RADAR site (${stamp()}).`,
        `Account: @${username} (${me.account_type || 'account type unknown'}, ${me.media_count == null ? '?' : me.media_count} posts)`,
        `Instagram user id: ${me.id || short.user_id || '-'}`,
        `Permissions: ${Array.isArray(short.permissions) ? short.permissions.join(', ') : (short.permissions || SCOPE)}`,
        isRadar ? '' : 'NOTE: this is not @radarcarpentry. A test run, or the wrong account was logged in.',
        '',
        `Key (60 days; renew before ${expires.toISOString().slice(0, 10)}):`,
        long.access_token,
        '',
        'Next, Just Sorted side:',
        '1. .venv/bin/python3 deliverables/customers/radar-carpentry/round5/ig-connect/setup_vercel_env.py --token  (paste the key)',
        '2. site-config.json: "instagram_source": "graph"; redeploy the site; run tools/radar_site_refresh.py --push',
        '3. Renewal before the date above: round5/ig-connect/BUILD_SPEC.md → Token renewal',
      ].filter((l) => l !== ''));
      res.setHeader('Set-Cookie', `${STATE_COOKIE}=; Path=/api/instagram-connect; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
      return page(res, 200, 'Connected', isRadar
        ? 'Thanks Kyle — Instagram is connected to radarcarpentry.com.au. You can close this.'
        : `Thanks — @${username} is connected to radarcarpentry.com.au. You can close this.`);
    } catch (e) {
      const reason = String((e && e.message) || e).slice(0, 160);
      log('instagram-connect: failed:', reason);
      await email(s, 'RADAR Instagram: connection failed', [
        `The code came back but the exchange with Instagram failed (${stamp()}).`, `reason: ${reason}`,
        'To do: check IG_APP_ID / IG_APP_SECRET on the Vercel project, the redirect URI on the Meta app, and that the account is an Instagram Tester; then ask Kyle to try again.',
      ]);
      return page(res, 200, "Something didn't go through", 'Instagram answered, but the connection could not be completed. Dave has been told and will sort it out. You can try again if you like:', retry(s));
    }
  };
}

module.exports = create();
module.exports.create = create;
