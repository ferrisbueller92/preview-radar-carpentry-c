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

  /* ---------- contact form (mailto) ---------- */
  var form = document.getElementById('quoteForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { return (form.elements[n] && form.elements[n].value || '').trim(); };
    var subject = 'Quote request — ' + (g('name') || 'website enquiry');
    var body = 'Name: ' + g('name') + '\nEmail: ' + g('email') + '\nPhone: ' + g('phone') + '\n\n' + g('message');
    window.location.href = 'mailto:info@radarcarpentry.com.au?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    var note = document.getElementById('formNote');
    if (note) note.textContent = 'Opening your email app — just hit send and we’ll be in touch.';
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

/* Projects strip (Round 2): Instagram posts from the Behold JSON feed when a feed URL is set, the snapshot JSON as the
   fallback, her own project stills when neither has posts, and a designed empty state only if all of that fails.
   The duplicate set that makes the loop seamless is hidden from assistive tech. The strip pauses off screen, on hover,
   on focus, and on its own Pause button. ?ig=fixture loads the QA fixture (never in production markup). */
;(function(){
  var strip=document.getElementById('igStrip'); if(!strip) return;
  var track=document.getElementById('igTrack'), empty=document.getElementById('igEmpty'), toggle=document.getElementById('igToggle');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var feed=strip.getAttribute('data-feed')||'';
  var snap=/[?&]ig=fixture(&|$)/.test(location.search)?'assets/data/ig-feed.fixture.json':strip.getAttribute('data-snapshot');
  var fallback=strip.getAttribute('data-fallback')||'';
  var GLYPH=empty?empty.querySelector('svg').outerHTML:'';
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function pick(p){ var s=p.sizes||{}; return (s.medium||s.large||s.full||s.small||{}).mediaUrl||p.thumbnailUrl||p.mediaUrl||''; }
  function igCard(p){
    var cap=(p.prunedCaption||p.caption||'').replace(/\s+/g,' ').trim();
    if(cap.length>72) cap=cap.slice(0,69).replace(/\s+\S*$/,'')+'\u2026';
    return '<a class="ig-card" href="'+esc(p.permalink)+'" target="_blank" rel="noopener"><img src="'+esc(pick(p))+'" alt="'+esc(p.altText||'Instagram post from RADAR Carpentry')+'" loading="lazy" width="700" height="700"><span class="ig-meta">'+GLYPH+'<span class="ig-cap">'+esc(cap)+'</span></span></a>';
  }
  function stillCard(p){
    return '<a class="ig-card is-still" href="'+esc(p.permalink)+'"><img src="'+esc(p.image)+'" alt="'+esc(p.alt||p.title)+'" loading="lazy" width="700" height="700"><span class="ig-meta"><span class="ig-cap"><b>'+esc(p.title)+'</b><i>'+esc(p.meta||'')+'</i></span></span></a>';
  }
  function mount(html,count){
    track.innerHTML=reduce?'<div class="ig-set">'+html+'</div>':'<div class="ig-set">'+html+'</div><div class="ig-set" aria-hidden="true">'+html.replace(/<a /g,'<a tabindex="-1" ')+'</div>';
    strip.style.setProperty('--ig-dur',Math.max(30,count*8)+'s');
    strip.classList.add('is-live');
  }
  function showEmpty(){ strip.classList.add('is-empty'); if(empty) empty.hidden=false; if(toggle) toggle.hidden=true; }
  function renderPosts(data){
    var posts=((data&&data.posts)||[]).filter(function(p){ return p&&p.permalink&&pick(p); });
    if(!posts.length) return false;
    mount(posts.map(igCard).join(''),posts.length); strip.classList.add('is-instagram'); return true;
  }
  function renderStills(data){
    var items=((data&&data.items)||[]).filter(function(p){ return p&&p.image&&p.permalink; });
    if(!items.length) return false;
    mount(items.map(stillCard).join(''),items.length); return true;
  }
  function load(url){ return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
  (feed?load(feed).catch(function(){ return load(snap); }):load(snap))
    .then(function(d){ if(!renderPosts(d)) throw new Error('no posts'); return true; })
    .catch(function(){ return fallback?load(fallback).then(renderStills):false; })
    .then(function(ok){ if(!ok) showEmpty(); })
    .catch(showEmpty);
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ es.forEach(function(e){ strip.classList.toggle('is-inview',e.isIntersecting); }); },{threshold:.05}).observe(strip);
  } else { strip.classList.add('is-inview'); }
  if(toggle){
    if(reduce) toggle.hidden=true;
    toggle.addEventListener('click',function(){
      var p=!strip.classList.contains('is-paused');
      strip.classList.toggle('is-paused',p); toggle.setAttribute('aria-pressed',String(p)); toggle.textContent=p?'Play':'Pause';
    });
  }
})();
