// RADAR Carpentry — her latest Instagram posts, fetched live the way her old Wix site does it (15 Sep 2026).
//
// Her Wix site holds the Instagram connection she approved there; every time a page loads, Wix's page asks Wix's servers
// for the posts. This asks the same servers the same way: first for the site's short-lived visitor pass, then for the
// posts. It goes through radarconstruction.com.au, her second domain, which stays connected to that Wix site after
// radarcarpentry.com.au moves to this one. The answer is shaped like the site's saved snapshot (assets/data/ig-feed.json),
// so the page shows it exactly as it shows the snapshot, albums included. Cached at the edge for ten minutes; if this ever
// fails, the page shows the saved snapshot instead.
//
// A bridge by design: once her own Instagram connection is made (the catch-up call), this reads that instead and Wix can
// be cancelled. Cancelling Wix, or removing its Instagram app, before then stops this, and the page falls back to the snapshot.

const WIX = 'https://www.radarconstruction.com.au';
const CONNECTION = '1679beb3-684f-4757-8acf-62de1494d1a6';
const USERNAME = 'radarcarpentry';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
// Wix hands out one pass per app on the site; any of them opened the Instagram call when tested (15 Sep 2026). The site's
// own Instagram app ("Instagram - Follow Us", id read from the page) is tried first, then the others.
const PREFERRED_APPS = ['c40997f8-2055-4de6-82e3-16de4c829af9'];

async function getJSON(url, headers, ms = 6000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: ctl.signal });
    if (!r.ok) throw new Error(`${new URL(url).pathname.split('/').slice(0, 4).join('/')} answered ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function pruned(caption) {
  return String(caption || '').replace(/(\s*#[^\s#]+)+\s*$/u, '').trim();
}

function shape(m) {
  const video = m.mediaType === 'VIDEO';
  const still = video ? (m.thumbnailUrl || '') : (m.mediaUrl || '');
  const flat = String(m.caption || '').replace(/\s+/g, ' ').trim();
  const post = {
    id: `ig-${m.mediaId}`,
    source: 'instagram-via-wix',
    timestamp: m.timestamp,
    permalink: m.permalink,
    mediaType: m.mediaType,
    caption: m.caption || '',
    prunedCaption: pruned(m.caption),
    altText: flat ? `Instagram post from RADAR Carpentry: ${flat.slice(0, 90)}` : 'Instagram post from RADAR Carpentry',
    sizes: { medium: { mediaUrl: still }, large: { mediaUrl: still } },
    mediaUrl: m.mediaUrl || '',
    thumbnailUrl: video ? (m.thumbnailUrl || '') : still,
    isReel: /\/reel\//.test(m.permalink || ''),
    likeCount: m.likeCount,
    commentsCount: m.commentsCount,
  };
  if (m.mediaType === 'CAROUSEL_ALBUM' && Array.isArray(m.children) && m.children.length) {
    post.children = m.children.map((c) => {
      const cv = c.mediaType === 'VIDEO';
      const cs = cv ? (c.thumbnailUrl || '') : (c.mediaUrl || '');
      return { id: `ig-${c.mediaId}`, mediaType: c.mediaType, mediaUrl: c.mediaUrl || '', thumbnailUrl: cv ? (c.thumbnailUrl || '') : cs,
               sizes: { medium: { mediaUrl: cs }, large: { mediaUrl: cs } } };
    });
  }
  return post;
}

module.exports = async (req, res) => {
  try {
    const model = await getJSON(`${WIX}/_api/v2/dynamicmodel`);
    const apps = (model && model.apps) || {};
    const passes = [...PREFERRED_APPS, ...Object.keys(apps)]
      .filter((id, i, all) => apps[id] && apps[id].instance && all.indexOf(id) === i)
      .map((id) => apps[id].instance)
      .slice(0, 3);
    if (!passes.length) throw new Error('Wix gave no visitor pass');
    let media = null;
    let lastError = null;
    for (const pass of passes) {
      try {
        media = await getJSON(`${WIX}/_api/instagram-accounts/v1/instagram-accounts/media/${CONNECTION}?connectionId=${CONNECTION}`, { authorization: pass });
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!media) throw lastError || new Error('no answer from the Instagram call');
    const posts = (media.media || []).filter((m) => m && m.permalink && (m.mediaUrl || m.thumbnailUrl)).map(shape);
    if (!posts.length) throw new Error('the Instagram call answered with no posts');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    return res.status(200).json({ username: USERNAME, source: 'instagram-via-wix', fetchedAt: new Date().toISOString(), posts });
  } catch (e) {
    console.error('instagram feed', e && e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Instagram posts are unavailable right now', detail: String((e && e.message) || e).slice(0, 160) });
  }
};
