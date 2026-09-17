/* RADAR Carpentry — Concept 3 interactions
   Lenis smooth scroll · Swiper hero · GSAP ScrollTrigger spine + parallax · IO reveals */
(function () {
  'use strict';
  window.__radarReady = true; /* the head watchdog drops html.js if this never runs (slow or blocked CDN) */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------- nav ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var drawer = document.getElementById('navDrawer');
  function onScroll() { if (window.scrollY > 40) nav.classList.add('scrolled'); else nav.classList.remove('scrolled'); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toggle) toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
  });
  if (drawer) drawer.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); document.body.style.overflow = ''; }
  });

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.2, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  }
  window.__radarLenis = lenis; /* Round 3: the lightbox stops/starts smooth scroll while open */

  /* ---------- hero carousel: Beth's drone clips (Round 2) ----------
     Each slide is a muted looping video. Sources are chosen per viewport (desktop = 16:9 band,
     phone = full portrait frame), HEVC first with H.264 fallback. Only the active slide plays; the
     next slide warms up while the current one runs. Reduced motion = posters only, nothing plays. */
  var heroEl = document.querySelector('.hero-swiper');
  if (typeof window.Swiper !== 'undefined' && heroEl) {
    var narrow = window.matchMedia('(max-width: 768px)').matches;
    var heroVids = Array.prototype.slice.call(heroEl.querySelectorAll('video.hero-video'));
    heroVids.forEach(function (v, i) {
      var base = v.getAttribute(narrow ? 'data-mobile' : 'data-desktop');
      var poster = v.getAttribute(narrow ? 'data-poster-mobile' : 'data-poster-desktop');
      if (poster) v.setAttribute('poster', poster);
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('preload', i === 0 && !reduce ? 'auto' : 'none');
      if (!reduce && base) {
        [['hevc', 'video/mp4; codecs="hvc1"'], ['h264', 'video/mp4']].forEach(function (s) {
          var el = document.createElement('source'); el.src = base + '.' + s[0] + '.mp4'; el.type = s[1]; v.appendChild(el);
        });
      }
    });
    var warm = function (v) { if (v && v.getAttribute('preload') === 'none') { v.setAttribute('preload', 'auto'); v.load(); } };
    var playActive = function (s) {
      if (reduce) return;
      var active = s.slides[s.activeIndex];
      heroVids.forEach(function (v) {
        if (active && active.contains(v)) {
          warm(v); try { v.currentTime = 0; } catch (e) {}
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) { v.pause(); }
      });
      var next = s.slides[(s.activeIndex + 1) % s.slides.length];
      if (next) warm(next.querySelector('video'));
    };
    var bullets = Array.prototype.slice.call(document.querySelectorAll('.hero-pag .bullet'));
    var pauseBtn = document.getElementById('heroPause');
    var heroPaused = false;
    var sw = new Swiper('.hero-swiper', {
      effect: 'fade', fadeEffect: { crossFade: true }, loop: true, speed: 1200, allowTouchMove: true,
      autoplay: reduce ? false : { delay: 7000, disableOnInteraction: false, pauseOnMouseEnter: false },
      a11y: { prevSlideMessage: 'Previous clip', nextSlideMessage: 'Next clip' },
      on: {
        init: function () { if (!heroPaused) playActive(this); },
        slideChangeTransitionStart: function () { if (!heroPaused) playActive(this); },
        slideChange: function () {
          var i = this.realIndex;
          bullets.forEach(function (b, n) {
            var on = n === i; b.classList.toggle('is-active', on);
            if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
          });
        }
      }
    });
    bullets.forEach(function (b, n) { b.addEventListener('click', function () { sw.slideToLoop(n); }); });
    /* a real pause control: stops the rotation and the playing clip; play resumes both (WCAG 2.2.2) */
    if (pauseBtn) {
      if (reduce) { pauseBtn.hidden = true; }
      pauseBtn.addEventListener('click', function () {
        heroPaused = !heroPaused;
        pauseBtn.classList.toggle('is-paused', heroPaused);
        pauseBtn.setAttribute('aria-pressed', String(heroPaused));
        pauseBtn.setAttribute('aria-label', heroPaused ? 'Play the clips' : 'Pause the clips');
        if (heroPaused) { if (sw.autoplay) sw.autoplay.stop(); heroVids.forEach(function (v) { v.pause(); }); }
        else { if (sw.autoplay) sw.autoplay.start(); playActive(sw); }
      });
    }
  }

  /* ---------- GSAP: scroll-line spine + media parallax ---------- */
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    var fill = document.querySelector('.spine i');
    var blip = document.querySelector('.spine b');
    if (fill) {
      if (reduce) { fill.style.transform = 'scaleY(1)'; }
      else {
        ScrollTrigger.create({
          trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.6,
          onUpdate: function (self) {
            var p = self.progress;
            fill.style.transform = 'scaleY(' + p + ')';
            if (blip) { blip.style.top = (p * 100) + 'vh'; blip.style.opacity = (p > 0.002 && p < 0.995) ? '1' : '0'; }
          }
        });
      }
    }
    if (!reduce) {
      gsap.utils.toArray('.media .bg img').forEach(function (img) {
        gsap.fromTo(img, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: img.closest('.media'), start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    }
  }

  /* ---------- reveals (IntersectionObserver) ----------
     A clip reveal (clip-path:inset) has an EMPTY intersection box, so the clipped element itself
     never intersects. Observe its wrapper instead, and keep a 1 s in-viewport fail-safe so nothing
     can stay hidden. Without JS (no html.js class) every reveal is visible from the start. */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal],[data-clip]'));
  function show(el) { el.classList.add('in'); }
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(show);
  } else {
    var pending = reveals.slice();
    var done = function (el) { show(el); var i = pending.indexOf(el); if (i > -1) pending.splice(i, 1); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var t = entry.target;
        if (t.hasAttribute('data-reveal') || t.hasAttribute('data-clip')) done(t);
        Array.prototype.forEach.call(t.querySelectorAll('[data-clip]'), done);
        io.unobserve(t);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el.hasAttribute('data-clip') ? el.parentElement : el); });
    var guard = setInterval(function () {
      pending.slice().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight * 0.92) done(el);
      });
      if (!pending.length) clearInterval(guard);
    }, 1000);
  }

  /* ---------- contact form ----------
     Live site: posts to /api/submit (the Just Sorted form handler emails info@radarcarpentry.com.au, reply-to the visitor).
     Anywhere without that handler (the preview link, a local copy), or if the post fails, the visitor's email app opens
     with the message filled in, as before. */
  var form = document.getElementById('quoteForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { return (form.elements[n] && form.elements[n].value || '').trim(); };
    var note = document.getElementById('formNote');
    var btn = form.querySelector('button[type="submit"]');
    var say = function (t) { if (note) note.textContent = t; };
    if (!g('name') || !/.+@.+\..+/.test(g('email')) || !g('message')) { say('Please add your name, a working email and a few words about the job.'); return; }
    var subject = 'Website enquiry — ' + g('name');
    var openMail = function () {
      var body = 'Name: ' + g('name') + '\nEmail: ' + g('email') + '\nPhone: ' + g('phone') + '\n\n' + g('message');
      window.location.href = 'mailto:info@radarcarpentry.com.au?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    };
    if (!/(^|\.)radarcarpentry\.com\.au$|\.vercel\.app$/.test(location.hostname)) {
      openMail(); say('Opening your email app — just hit send and we’ll be in touch.'); return;
    }
    var failed = function () { say('That didn’t go through, so your email app is opening with your message. Or call Kyle on 0467 210 448.'); openMail(); };
    // The old Wix site reported every enquiry to their Google Ads account as a lead ("Lead Event"). The live build sets
    // RADAR_ADS_LEAD beside the Google tag so this form keeps doing the same; nothing is sent where the tag is absent.
    var lead = function () { if (window.RADAR_ADS_LEAD && typeof window.gtag === 'function') window.gtag('event', 'conversion', { send_to: window.RADAR_ADS_LEAD }); };
    if (btn) btn.disabled = true;
    say('Sending…');
    fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: g('name'), email: g('email'), phone: g('phone'), message: g('message'), subject: subject,
      botcheck: form.elements.botcheck && form.elements.botcheck.checked ? 'on' : '' }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) { if (d && d.success) { form.reset(); say('Thanks — your message is on its way. We’ll be in touch within a day or two.'); lead(); } else { failed(); } })
      .catch(failed)
      .then(function () { if (btn) btn.disabled = false; });
  });

  /* ---------- careers form ----------
     The old Wix careers page had an application form that delivered. Same handler as enquiries (it builds the email from
     every field sent; first-name + last-name become the reply-to name); the subject marks it as an application. Never
     reported to Google Ads as a lead. Off the live site, or if the post fails, the visitor's email app opens instead. */
  var cform = document.getElementById('careersForm');
  if (cform) cform.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { return (cform.elements[n] && cform.elements[n].value || '').trim(); };
    var note = document.getElementById('careersNote');
    var btn = cform.querySelector('button[type="submit"]');
    var say = function (t) { if (note) note.textContent = t; };
    if (!g('first-name') || !/.+@.+\..+/.test(g('email'))) { say('Please add your first name and a working email.'); return; }
    var who = (g('first-name') + ' ' + g('last-name')).trim();
    var subject = 'Careers application — ' + who;
    var openMail = function () {
      var body = 'Name: ' + who + '\nEmail: ' + g('email') + '\nPhone: ' + g('phone') + '\nPosition: ' + g('position') + '\n\n' + g('message');
      window.location.href = 'mailto:info@radarcarpentry.com.au?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    };
    if (!/(^|\.)radarcarpentry\.com\.au$|\.vercel\.app$/.test(location.hostname)) {
      openMail(); say('Opening your email app — just hit send and we’ll be in touch.'); return;
    }
    var failed = function () { say('That didn’t go through, so your email app is opening with your details. Or call Kyle on 0467 210 448.'); openMail(); };
    if (btn) btn.disabled = true;
    say('Sending…');
    fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      'first-name': g('first-name'), 'last-name': g('last-name'), email: g('email'), phone: g('phone'), position: g('position'),
      message: g('message'), subject: subject, botcheck: cform.elements.botcheck && cform.elements.botcheck.checked ? 'on' : '' }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) { if (d && d.success) { cform.reset(); say('Thanks — your application is on its way. We’ll be in touch.'); } else { failed(); } })
      .catch(failed)
      .then(function () { if (btn) btn.disabled = false; });
  });
})();

/* RADAR reviews carousel */
;(function(){
  document.querySelectorAll('.reviews-carousel').forEach(function(root){
    var track=root.querySelector('.rc-track'); if(!track) return;
    var cards=Array.prototype.slice.call(track.children); if(!cards.length) return;
    var prev=root.querySelector('.rc-prev'), next=root.querySelector('.rc-next'), vp=root.querySelector('.rc-viewport');
    var i=Math.min(1,cards.length-1);
    function layout(){
      var cw=cards[0].getBoundingClientRect().width;
      var gap=parseFloat(getComputedStyle(track).gap)||24;
      var off=(vp.clientWidth-cw)/2;
      track.style.transform='translateX('+(off-i*(cw+gap))+'px)';
      cards.forEach(function(c,idx){var d=Math.abs(idx-i);c.classList.toggle('is-active',d===0);c.classList.toggle('is-near',d===1);});
      if(prev) prev.disabled=i<=0; if(next) next.disabled=i>=cards.length-1;
    }
    if(prev) prev.addEventListener('click',function(){if(i>0){i--;layout();}});
    if(next) next.addEventListener('click',function(){if(i<cards.length-1){i++;layout();}});
    window.addEventListener('resize',layout);
    setTimeout(layout,120); layout();
  });
})();

/* tile videos: play only in view, respect reduced motion */
;(function(){
  var vids=document.querySelectorAll('.tile-video,.inview-video'); if(!vids.length) return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ vids.forEach(function(v){ v.removeAttribute('autoplay'); v.pause(); }); return; }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      var v=e.target; v.muted=true;
      if(e.isIntersecting){ var p=v.play(); if(p&&p.catch) p.catch(function(){}); }
      else v.pause();
    });
  },{threshold:.15});
  vids.forEach(function(v){ io.observe(v); });
})();

/* Instagram (Round 3b, 10 Sep 2026): the old site's Instagram section, in Beth's skin. A STATIC row of square posts,
   no motion; a chevron pages the row (swipe on the phone); a tile shows only the picture, with a play glyph for video
   and an album glyph for albums; hover or focus shows the caption over the tile; click opens the post on-site in a
   lightbox (media, the handle, the caption and hashtags, the date). The projects page shows the same posts as a grid.
   Posts come from the live feed when the page names one (production: /api/instagram, 15 Sep 2026), else the local
   snapshot the nightly job writes (also the fallback when the feed is slow or down), then her project stills,
   then a designed empty state. Without JS every tile is a plain link to the post on Instagram. ?ig=fixture loads the
   QA fixture (never in production markup). */
;(function(){
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fixture=/[?&]ig=fixture(&|$)/.test(location.search);
  var HOME='https://www.instagram.com/radarcarpentry';
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function size(p,k){ var s=p.sizes||{}; return (s[k]||{}).mediaUrl||''; }
  function thumb(p){ return size(p,'medium')||size(p,'large')||size(p,'full')||size(p,'small')||p.thumbnailUrl||(p.mediaType==='VIDEO'?'':p.mediaUrl)||''; }
  function big(p){ return size(p,'large')||size(p,'full')||size(p,'medium')||p.thumbnailUrl||(p.mediaType==='VIDEO'?'':p.mediaUrl)||''; }
  function load(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
  function usable(data){ return ((data&&data.posts)||[]).filter(function(p){ return p&&p.permalink&&thumb(p); }); }
  // Production pages name a live feed (/api/instagram: her newest posts, fetched the way her old Wix site does). It is tried
  // first; if it is slow (4 s), down or empty, the saved snapshot is used instead, so the section never goes blank.
  function live(url){ return new Promise(function(ok,no){ var t=setTimeout(function(){ no(new Error('slow')); },4000);
    fetch(url).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(d){ clearTimeout(t); if(usable(d).length) ok(d); else no(new Error('empty')); },function(e){ clearTimeout(t); no(e); }); }); }
  var PLAY='<span class="ig-kind ig-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>';
  var ALBUM='<span class="ig-kind ig-album" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6H2v14a2 2 0 0 0 2 2h14v-2H4zm16-4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg></span>';
  /* 17 Sep 2026 (Beth: her old site's Instagram videos "automatically played… as soon as you [scroll] down to it, it would be
     moving"): a video tile carries the address of a small silent preview (assets/ig/<id>.preview.mp4, made by
     round5/ig_tile_previews.py), matched to a live-feed post by its permalink, else the post's own video; the tile
     controller below plays it in view. An album whose first item is a video moves too. */
  var previews={};
  function previewMap(s){ ((s&&s.posts)||[]).forEach(function(p){ if(p&&p.permalink&&p.previewUrl) previews[p.permalink]=p.previewUrl; }); }
  function playable(p){
    if(p.mediaType==='VIDEO') return p.previewUrl||previews[p.permalink]||p.mediaUrl||'';
    if(p.mediaType==='CAROUSEL_ALBUM'){ var k=(p.children||[])[0]; if(k&&k.mediaType==='VIDEO') return p.previewUrl||previews[p.permalink]||k.mediaUrl||''; }
    return '';
  }
  function card(p,i){
    var cap=(p.caption||p.prunedCaption||'').trim();
    var kind=p.mediaType==='VIDEO'?PLAY:(p.mediaType==='CAROUSEL_ALBUM'?ALBUM:'');
    var label=(p.mediaType==='VIDEO'?'Video: ':'')+(cap.replace(/\s+/g,' ').slice(0,90)||'Instagram post from RADAR Carpentry');
    var vid=playable(p);
    return '<a class="ig-card'+(vid?' has-video':'')+'" href="'+esc(p.permalink)+'" target="_blank" rel="noopener" data-i="'+i+'" aria-label="'+esc(label)+'"'+(vid?' data-video="'+esc(vid)+'" data-poster="'+esc(thumb(p))+'"':'')+'><img src="'+esc(thumb(p))+'" alt="'+esc(p.altText||'Instagram post from RADAR Carpentry')+'" loading="lazy" width="700" height="700">'+kind+'<span class="ig-hover" aria-hidden="true"><span>'+esc(cap)+'</span></span></a>';
  }

  /* ---------- lightbox (one per page) ---------- */
  var box=null;
  (function(){
    var dlg=document.getElementById('igDialog'); if(!dlg||typeof dlg.showModal!=='function') return;
    var media=document.getElementById('igdMedia'), cap=document.getElementById('igdCap'), date=document.getElementById('igdDate'), link=document.getElementById('igdLink');
    var prev=dlg.querySelector('.igd-prev'), next=dlg.querySelector('.igd-next'), close=dlg.querySelector('.igd-close');
    var list=[], idx=0, opener=null;
    function one(p,alt){
      if(p.mediaType==='VIDEO'&&p.mediaUrl){
        return '<video src="'+esc(p.mediaUrl)+'"'+(big(p)?' poster="'+esc(big(p))+'"':'')+' controls'+(reduce?'':' autoplay')+' muted playsinline loop preload="metadata" aria-label="'+esc(alt)+'"></video>';
      }
      return '<img src="'+esc(big(p))+'" alt="'+esc(alt)+'">';
    }
    function when(ts){ if(!ts) return ''; var d=new Date(ts); if(isNaN(d.getTime())) return ''; return d.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'}); }
    function render(){
      var p=list[idx]; if(!p) return;
      var alt=p.altText||'Instagram post from RADAR Carpentry';
      var kids=(p.mediaType==='CAROUSEL_ALBUM'&&p.children&&p.children.length)?p.children:null;
      if(kids){
        media.innerHTML='<div class="igd-album" tabindex="0" aria-label="'+kids.length+' items, scroll sideways">'+kids.map(function(c){ return '<div class="igd-item">'+one(c,alt)+'</div>'; }).join('')+'</div><span class="igd-count" aria-live="polite">1 / '+kids.length+'</span>';
        var al=media.querySelector('.igd-album'), ct=media.querySelector('.igd-count');
        al.addEventListener('scroll',function(){ var n=Math.round(al.scrollLeft/Math.max(1,al.clientWidth))+1; ct.textContent=Math.min(kids.length,Math.max(1,n))+' / '+kids.length; },{passive:true});
      } else { media.innerHTML='<div class="igd-item">'+one(p,alt)+'</div>'; }
      var text=(p.caption||p.prunedCaption||'').trim();
      cap.textContent=text; cap.hidden=!text;
      var d=when(p.timestamp); date.textContent=d; date.hidden=!d; if(p.timestamp) date.setAttribute('datetime',p.timestamp);
      link.href=p.permalink||HOME;
      prev.disabled=idx<=0; next.disabled=idx>=list.length-1;
      dlg.setAttribute('aria-label','Instagram post '+(idx+1)+' of '+list.length);
    }
    function stopMedia(){ Array.prototype.forEach.call(media.querySelectorAll('video'),function(v){ try{ v.pause(); }catch(e){} }); media.innerHTML=''; }
    function step(d){ var n=idx+d; if(n<0||n>=list.length) return; idx=n; stopMedia(); render(); }
    prev.addEventListener('click',function(){ step(-1); });
    next.addEventListener('click',function(){ step(1); });
    close.addEventListener('click',function(){ dlg.close(); });
    dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); });
    dlg.addEventListener('keydown',function(e){ if(e.key==='ArrowLeft'){ step(-1); } else if(e.key==='ArrowRight'){ step(1); } });
    dlg.addEventListener('close',function(){
      stopMedia(); document.body.classList.remove('igd-open'); tilesResume();
      if(window.__radarLenis&&window.__radarLenis.start) window.__radarLenis.start();
      if(opener&&opener.focus) opener.focus(); opener=null;
    });
    box={open:function(posts,i,from){
      list=posts||[]; if(!list.length) return; idx=Math.max(0,Math.min(i||0,list.length-1)); opener=from||document.activeElement;
      render(); document.body.classList.add('igd-open'); tilesPause();
      if(window.__radarLenis&&window.__radarLenis.stop) window.__radarLenis.stop();
      dlg.showModal(); close.focus();
    }};
  })();
  function wire(root,getPosts){
    root.addEventListener('click',function(e){
      var a=e.target.closest?e.target.closest('a.ig-card[data-i]'):null; if(!a||!box) return;
      e.preventDefault(); box.open(getPosts(),parseInt(a.getAttribute('data-i'),10)||0,a);
    });
  }

  /* ---------- tile videos play in view (17 Sep 2026) ----------
     Her old site's Instagram tiles moved as soon as they scrolled into view. A video tile gets a muted, inline, looping
     <video> only when it comes near the viewport (no bytes before that), plays while in view and pauses out of it; the
     picture stays underneath as the first frame. No autoplay under reduced motion, data saver or a slow connection (the
     play glyph stays and the lightbox still plays the post). At most 8 tiles play at once; all pause while the lightbox
     is open. */
  var conn=navigator.connection||{};
  var autoplayOK=!reduce&&('IntersectionObserver' in window)&&!conn.saveData&&!/2g/.test(conn.effectiveType||'')&&typeof fetch==='function'&&typeof URL!=='undefined'&&!!URL.createObjectURL;
  var MAX_PLAYING=8, FETCHES=3, playing=[], inview=[], fetching=[], tilesHeld=false;
  function sameOrigin(u){ return !/^https?:\/\//i.test(u)||u.indexOf(location.origin+'/')===0; }
  function tileVideo(a){
    var v=a.querySelector('video'); if(v) return v;
    v=document.createElement('video'); v.muted=true; v.defaultMuted=true; v.loop=true; v.playsInline=true;
    v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('loop',''); v.setAttribute('aria-hidden','true'); v.tabIndex=-1; v.preload='none';
    a.insertBefore(v,a.querySelector('.ig-kind')||a.querySelector('.ig-hover')); return v;  /* no poster: the tile's own picture shows until frames play (styles: video fades in with .is-playing) */
  }
  function stopTile(a){
    a.classList.remove('is-playing'); var v=a.querySelector('video'); if(v){ try{ v.pause(); }catch(e){} }
    var i=playing.indexOf(a); if(i>-1) playing.splice(i,1);
  }
  function startTile(a){
    if(tilesHeld||playing.indexOf(a)>-1||playing.length>=MAX_PLAYING) return;
    var v=tileVideo(a); if(!v.getAttribute('src')) v.src=a.getAttribute('data-blob');
    playing.push(a);
    var p=v.play();
    if(p&&p.then) p.then(function(){ if(playing.indexOf(a)>-1&&!v.paused) a.classList.add('is-playing'); },function(){ a.setAttribute('data-noplay',''); stopTile(a); });
    else a.classList.add('is-playing');
  }
  // The preview file is fetched like any other file (three at a time, 20 s limit each) and handed to the video as a local
  // blob, so playback never waits on the browser's media loader: Safari's engine left tiles stuck for ever when several
  // <video> elements loaded straight from the network (live grid, 17 Sep 2026). A remote video (a brand-new post with no
  // preview yet) plays straight from its address instead. A file that fails to arrive is left alone until the page reloads.
  function fetchTile(a){
    var url=a.getAttribute('data-video');
    if(!sameOrigin(url)){ a.setAttribute('data-blob',url); return Promise.resolve(); }
    var ctl=('AbortController' in window)?new AbortController():null, timer=ctl?setTimeout(function(){ ctl.abort(); },20000):null;
    return fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); })
      .then(function(b){ if(timer) clearTimeout(timer); a.setAttribute('data-blob',URL.createObjectURL(b)); },
            function(){ if(timer) clearTimeout(timer); a.setAttribute('data-noplay',''); });
  }
  function pump(){
    if(tilesHeld) return;
    inview.forEach(function(a){ if(a.hasAttribute('data-blob')&&!a.hasAttribute('data-noplay')) startTile(a); });
    while(fetching.length<FETCHES&&playing.length+fetching.length<MAX_PLAYING){
      var a=null; for(var i=0;i<inview.length;i++){ var c=inview[i]; if(!c.hasAttribute('data-blob')&&!c.hasAttribute('data-noplay')&&fetching.indexOf(c)<0){ a=c; break; } }
      if(!a) return;
      (function(t){ fetching.push(t); fetchTile(t).then(function(){ fetching.splice(fetching.indexOf(t),1); pump(); }); })(a);
    }
  }
  var tio=autoplayOK?new IntersectionObserver(function(es){
    es.forEach(function(e){ var a=e.target, i=inview.indexOf(a);
      if(e.isIntersecting){ if(i<0) inview.push(a); } else { if(i>-1) inview.splice(i,1); stopTile(a); } });
    pump();
  },{rootMargin:'160px 0px',threshold:0.35}):null;
  function tiles(root){ if(!tio) return; Array.prototype.forEach.call(root.querySelectorAll('a.ig-card[data-video]'),function(a){ tio.observe(a); }); }
  function tilesPause(){ tilesHeld=true; inview.slice().forEach(stopTile); }
  function tilesResume(){ tilesHeld=false; pump(); }

  /* ---------- the row on the home page ---------- */
  (function(){
    var row=document.getElementById('igStrip'); if(!row) return;
    var track=document.getElementById('igTrack'), empty=document.getElementById('igEmpty');
    var prev=row.querySelector('.ig-prev'), next=row.querySelector('.ig-next');
    var feed=fixture?'':(row.getAttribute('data-feed')||'');
    var snap=fixture?'assets/data/ig-feed.fixture.json':row.getAttribute('data-snapshot');
    var fallback=row.getAttribute('data-fallback')||'';
    var posts=[];
    function stillCard(p){
      return '<a class="ig-card is-still" href="'+esc(p.permalink)+'"><img src="'+esc(p.image)+'" alt="'+esc(p.alt||p.title)+'" loading="lazy" width="700" height="700"><span class="ig-meta"><span class="ig-cap"><b>'+esc(p.title)+'</b><i>'+esc(p.meta||'')+'</i></span></span></a>';
    }
    function arrows(){
      if(!prev||!next) return;
      var over=track.scrollWidth>track.clientWidth+4;
      prev.hidden=!over; next.hidden=!over;
      prev.disabled=track.scrollLeft<=2; next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;
    }
    function mount(html){ track.innerHTML=html; row.classList.add('is-live'); tiles(track); arrows(); setTimeout(arrows,300); }
    function showEmpty(){ row.classList.add('is-empty'); if(empty) empty.hidden=false; if(prev) prev.hidden=true; if(next) next.hidden=true; }
    function renderPosts(data){
      var ok=usable(data); if(!ok.length) return false;
      posts=ok; mount(ok.map(card).join('')); row.classList.add('is-instagram'); return true;
    }
    function renderStills(data){
      var items=((data&&data.items)||[]).filter(function(p){ return p&&p.image&&p.permalink; });
      if(!items.length) return false;
      mount(items.map(stillCard).join('')); return true;
    }
    // the saved snapshot also carries the tile previews; when a live feed is named it is read alongside so its previews match by permalink
    var pv=feed?load(snap).then(previewMap).catch(function(){}):Promise.resolve();
    Promise.all([(feed?live(feed).catch(function(){ return load(snap); }):load(snap)).catch(function(){ return null; }),pv])
      .then(function(r){ if(!renderPosts(r[0])) throw new Error('no posts'); return true; })
      .catch(function(){ return fallback?load(fallback).then(renderStills):false; })
      .then(function(ok){ if(!ok) showEmpty(); })
      .catch(showEmpty);
    function page(dir){ track.scrollBy({left:dir*Math.max(160,track.clientWidth*0.9),behavior:reduce?'auto':'smooth'}); }
    if(prev) prev.addEventListener('click',function(){ page(-1); });
    if(next) next.addEventListener('click',function(){ page(1); });
    track.addEventListener('scroll',arrows,{passive:true});
    window.addEventListener('resize',arrows);
    track.addEventListener('keydown',function(e){ if(e.target!==track) return; if(e.key==='ArrowRight'){ e.preventDefault(); page(1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); page(-1); } });
    wire(track,function(){ return posts; });
  })();

  /* ---------- the grid on the projects page ---------- */
  (function(){
    var grid=document.getElementById('igGrid'); if(!grid) return;
    var sec=grid.closest('section'), also=Array.prototype.slice.call(document.querySelectorAll('[data-with-grid]'));
    var feed=fixture?'':(grid.getAttribute('data-feed')||'');
    var snap=fixture?'assets/data/ig-feed.fixture.json':grid.getAttribute('data-snapshot');
    var posts=[];
    var pv=feed?load(snap).then(previewMap).catch(function(){}):Promise.resolve();
    Promise.all([(feed?live(feed).catch(function(){ return load(snap); }):load(snap)),pv]).then(function(r){
      var d=r[0], ok=usable(d); if(!ok.length) return;
      posts=ok; grid.innerHTML=ok.map(card).join(''); tiles(grid);
      if(sec) sec.hidden=false; also.forEach(function(el){ el.hidden=false; });
      if(window.ScrollTrigger&&window.ScrollTrigger.refresh) window.ScrollTrigger.refresh();
    }).catch(function(){});
    wire(grid,function(){ return posts; });
  })();
})();
