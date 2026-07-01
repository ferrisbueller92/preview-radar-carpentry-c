/* RADAR Carpentry — Concept 3 interactions
   Lenis smooth scroll · Swiper hero · GSAP ScrollTrigger spine + parallax · IO reveals */
(function () {
  'use strict';
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

  /* ---------- hero carousel ---------- */
  if (typeof window.Swiper !== 'undefined' && document.querySelector('.hero-swiper')) {
    var bullets = Array.prototype.slice.call(document.querySelectorAll('.hero-pag .bullet'));
    var sw = new Swiper('.hero-swiper', {
      effect: 'fade', fadeEffect: { crossFade: true }, loop: true, speed: 1200, allowTouchMove: true,
      autoplay: reduce ? false : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
      a11y: { prevSlideMessage: 'Previous project', nextSlideMessage: 'Next project' },
      on: {
        slideChange: function () {
          var i = this.realIndex;
          bullets.forEach(function (b, n) { b.classList.toggle('is-active', n === i); });
        }
      }
    });
    bullets.forEach(function (b, n) { b.addEventListener('click', function () { sw.slideToLoop(n); }); });
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

  /* ---------- reveals (IntersectionObserver) ---------- */
  var reveals = document.querySelectorAll('[data-reveal],[data-clip]');
  if (reduce) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
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
