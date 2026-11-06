(function () {
  'use strict';

  var cfg = window.SALVE || {};
  var products = cfg.products || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- WhatsApp ---------- */
  function waNumber(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    return d.charAt(0) === '0' ? '62' + d.slice(1) : d;
  }
  function waLink(text) {
    return 'https://wa.me/' + waNumber(cfg.whatsapp) + '?text=' + encodeURIComponent(text);
  }
  document.querySelectorAll('.js-wa').forEach(function (a) {
    a.href = waLink(a.dataset.msg);
  });

  if (cfg.instagram) {
    var igName = String(cfg.instagram).replace(/^@/, '');
    document.querySelectorAll('.js-ig').forEach(function (a) {
      a.href = 'https://instagram.com/' + igName;
      a.hidden = false;
      var handle = a.querySelector('[data-handle]');
      if (handle) handle.textContent = '@' + igName;
    });
  }

  /* ---------- Mobile menu ---------- */
  var nav = document.querySelector('.nav');
  var navToggle = nav.querySelector('.nav__toggle');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.textContent = open ? 'Tutup' : 'Menu';
  }
  navToggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.querySelectorAll('.nav__links a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); navToggle.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
    if (e.matches) setMenu(false);
  });

  /* Filled in by the player below; keeps its Order link in step with the picked size. */
  var syncPlayer = function () {};

  /* ---------- Products: price, size, order, front/back ---------- */
  function rupiah(v) {
    var n = Number(v);
    return n > 0 ? 'Rp ' + n.toLocaleString('id-ID') : '';
  }

  document.querySelectorAll('.track').forEach(function (track) {
    var data = products[track.dataset.product] || {};
    var sizes = Array.isArray(data.sizes) ? data.sizes : [];
    var buy = track.querySelector('.buy');
    var picked = null;

    var price = document.createElement('p');
    price.className = 'buy__price';
    price.textContent = rupiah(data.price) || 'Harga via chat';
    buy.appendChild(price);

    var btn = document.createElement('a');
    btn.className = 'btn';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.textContent = 'Order via WhatsApp';

    function refresh() {
      var name = track.dataset.name;
      var msg = picked
        ? 'Halo Salve.co, saya mau order ' + name + ', ukuran ' + picked + '. Masih ada stok?'
        : 'Halo Salve.co, saya mau order ' + name + '. Boleh info harga, ukuran, dan stoknya?';
      btn.href = waLink(msg);
      syncPlayer(track);
    }

    if (sizes.length) {
      var group = document.createElement('div');
      group.className = 'sizes';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Pilih ukuran');
      sizes.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = s;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          picked = picked === s ? null : s;
          group.querySelectorAll('button').forEach(function (x) {
            x.setAttribute('aria-pressed', String(x.textContent === picked));
          });
          refresh();
        });
        group.appendChild(b);
      });
      buy.appendChild(group);
    }
    refresh();
    buy.appendChild(btn);

    var buttons = track.querySelectorAll('.views button');
    var imgs = track.querySelectorAll('.stage__img');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        imgs.forEach(function (im) { im.classList.toggle('is-on', im.dataset.view === b.dataset.show); });
      });
    });
  });

  /* ---------- Now playing bar ---------- */
  var player = document.querySelector('.player');
  var tracks = Array.prototype.slice.call(document.querySelectorAll('.track'));
  if (player && 'IntersectionObserver' in window) {
    var current = null;
    var order = player.querySelector('.player__order');
    var prev = player.querySelector('[data-skip="-1"]');
    var next = player.querySelector('[data-skip="1"]');

    var setCurrent = function (track) {
      current = track;
      player.classList.toggle('is-on', !!track);
      if (!track) return;
      var i = tracks.indexOf(track);
      player.querySelector('.player__num').textContent = track.querySelector('.track__num').textContent;
      player.querySelector('.player__name').textContent = track.dataset.title;
      order.href = track.querySelector('.buy a').href;
      prev.disabled = i === 0;
      next.disabled = i === tracks.length - 1;
    };
    syncPlayer = function (track) {
      if (track === current) order.href = track.querySelector('.buy a').href;
    };

    /* The track crossing the middle of the screen is the one "playing". */
    var playing = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setCurrent(e.target);
        else if (e.target === current) setCurrent(null);
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    tracks.forEach(function (t) { playing.observe(t); });

    player.querySelectorAll('[data-skip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var to = tracks[tracks.indexOf(current) + Number(b.dataset.skip)];
        if (to) to.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- Scene parallax ---------- */
  var scenes = document.querySelectorAll('.scene');
  if (!reduced && scenes.length) {
    var sceneTick = false;
    var paintScenes = function () {
      sceneTick = false;
      var vh = window.innerHeight;
      scenes.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        /* -1 when the scene enters at the bottom, +1 when it leaves at the top. */
        var p = (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2);
        s.querySelector('.scene__img').style.transform = 'translateY(' + (p * r.height * 0.07).toFixed(1) + 'px)';
      });
    };
    var onSceneScroll = function () {
      if (!sceneTick) { sceneTick = true; requestAnimationFrame(paintScenes); }
    };
    window.addEventListener('scroll', onSceneScroll, { passive: true });
    window.addEventListener('resize', onSceneScroll);
    paintScenes();
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero covers drift ---------- */
  var drift = document.querySelectorAll('[data-drift]');
  var wide = window.matchMedia('(min-width: 701px)');
  if (!reduced && drift.length) {
    var ticking = false;
    var paint = function () {
      ticking = false;
      var y = Math.min(window.scrollY, window.innerHeight * 1.5);
      drift.forEach(function (el) {
        el.style.transform = wide.matches ? 'translateY(' + (y * parseFloat(el.dataset.drift)).toFixed(1) + 'px)' : '';
      });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    wide.addEventListener('change', paint);
    paint();
  }

  /* ---------- Lightbox ---------- */
  var box = document.querySelector('.lightbox');
  if (box && typeof box.showModal === 'function') {
    var full = box.querySelector('img');
    document.querySelectorAll('.look').forEach(function (b) {
      var thumb = b.querySelector('img');
      b.setAttribute('aria-label', 'Perbesar: ' + thumb.alt);
      b.addEventListener('click', function () {
        full.src = b.dataset.full;
        full.alt = thumb.alt;
        box.showModal();
      });
    });
    box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('close', function () { full.removeAttribute('src'); });
  }
})();
