// Just Sorted — owned form handler (Resend). Reusable across every client site.
// Zero dependencies (native fetch). Drop into any static Vercel project at /api/submit.js
// and configure per client with env vars — the client never signs up for anything.
//
// Required Vercel env vars (set per project):
//   RESEND_API_KEY   Just Sorted's Resend API key (one account, all clients)
//   FORM_TO          where submissions go, e.g. hello@ralleepeople.com
//   FORM_FROM        verified sender, e.g. "Rallee Website <forms@justsorted.com>"
//   FORM_SITE        label for subject/body, e.g. ralleepeople.com
// Optional:
//   FORM_ALLOWED_ORIGIN   e.g. https://www.ralleepeople.com (rejects off-site posts)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    b = b || {};

    // 1) honeypot — a bot filling the hidden field gets a silent 200 (dropped)
    if (b.botcheck) return res.status(200).json({ success: true });

    // 2) optional origin allow-list
    const allowed = process.env.FORM_ALLOWED_ORIGIN;
    if (allowed) {
      const origin = req.headers.origin || '';
      let host = ''; try { host = new URL(allowed).hostname.replace(/^www\./, ''); } catch {}
      if (origin && host && !origin.replace(/^https?:\/\/(www\.)?/, '').startsWith(host)) {
        return res.status(403).json({ success: false, message: 'Bad origin' });
      }
    }

    const KEY  = process.env.RESEND_API_KEY;
    const TO   = process.env.FORM_TO;
    const FROM = process.env.FORM_FROM || 'Website <forms@justsorted.com>';
    const SITE = process.env.FORM_SITE || 'the website';
    if (!KEY || !TO) return res.status(500).json({ success: false, message: 'Form not configured' });

    const email = String(b.email || '').trim();
    const name  = [b['first-name'], b['last-name']].filter(Boolean).join(' ') || b.name || '';
    const subject = b.subject || `New enquiry via ${SITE}`;

    // build a readable table from every real field the visitor sent
    const skip = new Set(['botcheck', 'subject', 'attachment', 'access_key', 'from_name']);
    const rows = Object.entries(b)
      .filter(([k, v]) => !skip.has(k) && v && typeof v === 'string')
      .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#666;vertical-align:top"><b>${esc(k)}</b></td>` +
                       `<td style="padding:4px 0">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
    const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111;line-height:1.5">` +
      `<p style="margin:0 0 12px">New submission from <b>${esc(SITE)}</b>:</p>` +
      `<table style="border-collapse:collapse">${rows}</table></div>`;

    // CV / file attachment — base64 from the client
    let attachments;
    if (b.attachment && b.attachment.content && b.attachment.filename) {
      const bytes = Math.floor(b.attachment.content.length * 0.75);
      if (bytes > 4 * 1024 * 1024) {
        return res.status(413).json({ success: false, message: 'File too large (max 4MB)' });
      }
      attachments = [{
        filename: b.attachment.filename,
        content: b.attachment.content,
        content_type: b.attachment.type || undefined,
      }];
    }

    const payload = { from: FROM, to: [TO], subject, html };
    if (attachments) payload.attachments = attachments;
    if (email && /.+@.+\..+/.test(email)) payload.reply_to = name ? `${name} <${email}>` : email;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      console.error('Resend error', r.status, await r.text().catch(() => ''));
      return res.status(502).json({ success: false, message: `Could not send — please email ${TO}` });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('submit handler error', e);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
