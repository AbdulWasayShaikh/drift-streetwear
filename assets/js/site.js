/* DRIFT: Lenis smooth scroll, GSAP ScrollTrigger flip-in entrances, the showcase
   carousel, the marquee and the cart. Plain vanilla, no build step.
   Photos only get a src if their name is listed in assets/img/images.json, so a
   missing file shows the drawn garment placeholder instead of a broken image. */
(() => {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const doc = document.documentElement;

  $('#yr').textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------- photos */
  let HAVE = [];
  // absolute, because a relative url in a custom property resolves against the CSS file
  const imgUrl = name => new URL('assets/img/' + name + '.jpg', document.baseURI).href;

  function paint(el) {
    const name = el.getAttribute('data-img');
    const shape = el.getAttribute('data-shape') || 'g-tee';
    el.classList.remove('drawn');
    const old = el.querySelector(':scope > svg.ghost');
    if (old) old.remove();
    if (name && HAVE.indexOf(name) >= 0) {
      el.style.setProperty('--img', "url('" + imgUrl(name) + "')");
      return;
    }
    el.style.removeProperty('--img');
    el.classList.add('drawn');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ghost');
    svg.setAttribute('aria-hidden', 'true');
    // the symbol scales into this box; without a viewBox the use renders at its own size
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.innerHTML = '<use href="#' + shape + '" width="100" height="100"/>';
    el.appendChild(svg);
  }
  function paintAll() { $$('[data-img]').forEach(paint); }

  fetch('assets/img/images.json')
    .then(r => (r.ok ? r.json() : []))
    .then(list => { HAVE = Array.isArray(list) ? list : []; paintAll(); })
    .catch(() => paintAll());
  paintAll();

  /* ---------------------------------------------------------------- header */
  const head = $('#head');
  let solid = null;
  const onHeadScroll = () => {
    const s = window.pageYOffset > 24;
    if (s !== solid) { head.classList.toggle('solid', s); solid = s; }
  };
  window.addEventListener('scroll', onHeadScroll, { passive: true });
  onHeadScroll();

  const burger = $('#burger');
  const closeMenu = () => { head.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = !head.classList.contains('open');
    head.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#mainnav a').forEach(a => a.addEventListener('click', closeMenu));

  /* ------------------------------------------------- lenis + gsap, in sync */
  let lenis = null;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  if (typeof window.Lenis !== 'undefined' && !reduced.matches) {
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollToEl = el => {
    if (lenis) lenis.scrollTo(el, { offset: -60 });
    else el.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(el);
    });
  });

  /* --------------------------------------------- the flip-in entrance, all */
  doc.classList.add('shown');

  if (hasGsap && !reduced.matches) {
    // every section stages in: fade up and rotate out of the page plane
    $$('.sec, .identity, .show, .foot').forEach(sec => {
      const items = $$('.flip', sec);
      if (!items.length) return;
      gsap.set(items, { opacity: 0, y: 50, rotateX: -40, transformPerspective: 1000, transformOrigin: '50% 0%' });
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 78%',
        once: true,
        onEnter: () => gsap.to(items, { opacity: 1, y: 0, rotateX: 0, duration: 1, ease: 'power4.out', stagger: 0.08 })
      });
    });
  } else {
    gsap && gsap.set && gsap.set($$('.flip'), { clearProps: 'all' });
  }

  /* ------------------------------------------------------------ hero intro */
  (() => {
    const lines = $$('.hero h1 .ln');
    lines.forEach(ln => { ln.innerHTML = '<span>' + ln.textContent + '</span>'; });
    if (!hasGsap || reduced.matches) return;
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from('.hero h1 .ln>span', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09 }, 0)
      .from('[data-hero="1"]', { opacity: 0, y: 20, duration: .7, ease: 'power3.out' }, 0.05)
      .from('[data-hero="3"], [data-hero="4"]', { opacity: 0, y: 24, duration: .9, ease: 'power3.out', stagger: .08 }, 0.5)
      .from('.hero-photo', { opacity: 0, scale: 1.04, duration: 1.4, ease: 'power3.out' }, 0)
      .from('.glass', { opacity: 0, y: 26, rotateX: -30, transformPerspective: 900, duration: .8, ease: 'power3.out', stagger: .08 }, 0.6)
      .from('.statsbar', { opacity: 0, y: 30, duration: .9, ease: 'power3.out' }, 0.75);

    // the hero photo drifts slower than the words as you leave
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1,
      animation: gsap.to('.hero-photo', { y: 70, ease: 'none' })
    });
  })();

  /* --------------------------------------------------- 2. showcase carousel */
  (() => {
    const LOOKS = [
      { name: 'Fracture Hoodie', cat: 'HOODIES', price: 'Rs 12,900', num: 12900, img: 'prod-hoodie', shape: 'g-hood', line: 'Oversized, dropped shoulder, brushed inside. The one people ask about.' },
      { name: 'Static Tee', cat: 'T-SHIRTS', price: 'Rs 5,400', num: 5400, img: 'prod-tee', shape: 'g-tee', line: '260 gsm, boxy, and the sleeves stop exactly where they should.' },
      { name: 'Cargo 02', cat: 'PANTS', price: 'Rs 9,900', num: 9900, img: 'prod-cargo', shape: 'g-pant', line: 'Six pockets, straight leg, heavy enough to hold its shape.' },
      { name: 'Sonic 01 Low', cat: 'FOOTWEAR', price: 'Rs 18,400', num: 18400, img: 'prod-shoe', shape: 'g-shoe', line: 'Low profile, chunky sole, one colour and nothing else.' }
    ];
    let i = 0, busy = false;

    const shotA = $('#shotA'), shotB = $('#shotB'), queue = $('#queue');
    const nameEl = $('#showName'), priceEl = $('#showPrice'), lineEl = $('#showLine');
    const crumb = $('#crumbCat'), idxEl = $('#showIdx'), addBtn = $('#showAdd');

    LOOKS.forEach((L, n) => {
      const q = document.createElement('button');
      q.type = 'button';
      q.className = 'qi' + (n === 0 ? ' on' : '');
      q.setAttribute('data-img', L.img);
      q.setAttribute('data-shape', L.shape);
      q.setAttribute('aria-label', L.name);
      q.addEventListener('click', () => go(n));
      queue.appendChild(q);
      paint(q);
    });
    queue.removeAttribute('aria-hidden');

    function fill(el, L) {
      el.setAttribute('data-img', L.img);
      el.setAttribute('data-shape', L.shape);
      paint(el);
    }
    function meta(L, n) {
      nameEl.textContent = L.name;
      priceEl.textContent = L.price;
      lineEl.textContent = L.line;
      crumb.textContent = L.cat;
      idxEl.textContent = String(n + 1).padStart(2, '0');
      addBtn.setAttribute('data-name', L.name);
      addBtn.setAttribute('data-price', String(L.num));
      // a thumb hint for the cart row, never data-img: that would paint the button itself
      addBtn.setAttribute('data-thumb', L.img);
      addBtn.setAttribute('data-thumb-shape', L.shape);
      $$('.qi', queue).forEach((q, k) => q.classList.toggle('on', k === n));
    }
    function go(n) {
      n = (n + LOOKS.length) % LOOKS.length;
      if (n === i || busy) return;
      const L = LOOKS[n], back = i;
      i = n;
      if (!hasGsap || reduced.matches) { fill(shotA, L); meta(L, n); return; }
      busy = true;
      fill(shotB, L);
      const dir = (n > back || (back === LOOKS.length - 1 && n === 0)) ? 1 : -1;
      gsap.set(shotB, { opacity: 0, scale: 0.86, xPercent: 6 * dir, rotateY: -6 * dir, transformPerspective: 1200 });
      gsap.timeline({
        onComplete: () => {
          fill(shotA, L);
          gsap.set(shotA, { opacity: 1, scale: 1, xPercent: 0, rotateY: 0, filter: 'blur(0px)' });
          gsap.set(shotB, { opacity: 0 });
          busy = false;
        }
      })
        .to(shotA, { opacity: 0, scale: 1.05, xPercent: -8 * dir, filter: 'blur(8px)', duration: .55, ease: 'power3.in' }, 0)
        .to(shotB, { opacity: 1, scale: 1, xPercent: 0, rotateY: 0, duration: .8, ease: 'power4.out' }, .12);
      gsap.fromTo([nameEl, priceEl, lineEl], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .05, delay: .12 });
      meta(L, n);
    }
    $('#nextBtn').addEventListener('click', () => go(i + 1));
    $('#prevBtn').addEventListener('click', () => go(i - 1));
    meta(LOOKS[0], 0);

    // sizes and swatches
    $$('#sizeRow .sz').forEach(b => b.addEventListener('click', () => {
      $$('#sizeRow .sz').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    }));
    $$('#swRow .sw').forEach(b => b.addEventListener('click', () => {
      $$('#swRow .sw').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    }));
  })();

  /* ------------------------------------------------------ 3. popular picks */
  (() => {
    const rail = $('#rail');
    const step = () => Math.min(rail.clientWidth * 0.8, 680);
    $('#railNext').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduced.matches ? 'auto' : 'smooth' }));
    $('#railPrev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduced.matches ? 'auto' : 'smooth' }));
  })();

  /* ----------------------------------------------------------- 6. marquee */
  (() => {
    const track = $('#track');
    if (!track) return;
    const originals = $$('.mi', track);
    originals.forEach(el => { const c = el.cloneNode(true); track.appendChild(c); paint(c); });
    if (reduced.matches) return;

    let x = 0, half = 0, last = 0, boost = 1;
    const measure = () => { half = track.scrollWidth / 2; };
    measure();
    window.addEventListener('resize', measure);
    if (lenis) lenis.on('scroll', e => { boost = 1 + Math.min(3, Math.abs(e.velocity || 0) * 0.08); });

    const tick = now => {
      const dt = Math.min(64, now - (last || now));
      last = now;
      boost += (1 - boost) * 0.06;                 // eases back to base speed
      if (!document.hidden && half) {
        x -= (dt / 1000) * 46 * boost;
        if (x <= -half) x += half;
        track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* ---------------------------------------------------------- 7. featured */
  (() => {
    const main = $('#featMain');
    $$('#featThumbs .th').forEach(t => {
      paint(t);
      t.addEventListener('click', () => {
        $$('#featThumbs .th').forEach(x => x.classList.remove('on'));
        t.classList.add('on');
        main.setAttribute('data-img', t.getAttribute('data-img'));
        main.setAttribute('data-shape', t.getAttribute('data-shape'));
        paint(main);
        if (hasGsap && !reduced.matches) {
          gsap.fromTo(main, { opacity: .35, scale: 1.04 }, { opacity: 1, scale: 1, duration: .6, ease: 'power3.out' });
        }
      });
    });
  })();

  /* -------------------------------------------------------------- the cart */
  (() => {
    const drawer = $('#cart'), backdrop = $('#backdrop'), body = $('#cartBody');
    const countEl = $('#cartCount'), totalEl = $('#cartTotal');
    const items = [];
    let lastFocus = null;

    const money = n => 'Rs ' + n.toLocaleString('en-PK');

    function render() {
      const qty = items.reduce((s, it) => s + it.q, 0);
      countEl.textContent = String(qty);
      totalEl.textContent = money(items.reduce((s, it) => s + it.q * it.price, 0));
      if (!items.length) { body.innerHTML = '<p class="empty">Your bag is empty. The drop is one scroll up.</p>'; return; }
      body.innerHTML = '';
      items.forEach((it, n) => {
        const row = document.createElement('div');
        row.className = 'ci';
        row.innerHTML =
          '<span class="cim" data-img="' + (it.img || '') + '" data-shape="' + (it.shape || 'g-tee') + '"></span>' +
          '<div><b>' + it.name + '</b><span>' + money(it.price) + '</span></div>' +
          '<div class="qty"><button type="button" aria-label="One less ' + it.name + '">&minus;</button>' +
          '<b>' + it.q + '</b><button type="button" aria-label="One more ' + it.name + '">+</button></div>';
        const [minus, plus] = $$('button', row);
        minus.addEventListener('click', () => { it.q--; if (it.q <= 0) items.splice(n, 1); render(); });
        plus.addEventListener('click', () => { it.q++; render(); });
        body.appendChild(row);
        paint($('.cim', row));
      });
    }

    function open() {
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add('on'));
      drawer.classList.add('on');
      drawer.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      $('#cartClose').focus();
    }
    function close() {
      backdrop.classList.remove('on');
      drawer.classList.remove('on');
      drawer.setAttribute('aria-hidden', 'true');
      setTimeout(() => { backdrop.hidden = true; }, 400);
      if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus();
    }
    $('#cartBtn').addEventListener('click', open);
    $('#cartClose').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('on')) close(); });

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      const name = btn.getAttribute('data-name') || $('#showName').textContent;
      const price = Number(btn.getAttribute('data-price') || 0);
      const card = btn.closest('.card, .details, #featured');
      const art = card ? $('[data-img]', card) : null;
      const img = btn.getAttribute('data-thumb') || (art ? art.getAttribute('data-img') : '');
      const shape = btn.getAttribute('data-thumb-shape') || (art ? art.getAttribute('data-shape') : 'g-tee');
      const found = items.find(it => it.name === name);
      if (found) found.q++;
      else items.push({ name, price: price || 0, q: 1, img, shape });
      render();
      open();
      if (hasGsap && !reduced.matches) gsap.fromTo(countEl, { scale: 1.6 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    });

    $('#checkout').addEventListener('click', () => {
      const note = $('.cartfoot .fnote');
      note.textContent = items.length
        ? 'Demo store: this is where the payment step would open.'
        : 'Add something to the bag first.';
    });

    $('#searchBtn').addEventListener('click', () => scrollToEl($('#picks')));
    render();
  })();

  /* --------------------------------------------------------- newsletter */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const mail = $('#newsMail'), note = $('#newsNote');
    if (!mail.reportValidity()) return;
    note.textContent = 'You are on the list. The next drop lands in your inbox first.';
    mail.value = '';
  });

  /* reduced motion, honoured live in both directions */
  const onRM = () => { if (reduced.matches && lenis) lenis.stop(); else if (lenis) lenis.start(); };
  if (reduced.addEventListener) reduced.addEventListener('change', onRM);
})();
