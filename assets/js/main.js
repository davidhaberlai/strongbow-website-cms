// THE STRONGBOW — main.js

document.addEventListener('DOMContentLoaded', () => {
  /* ---- Header scroll state ---- */
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.querySelector('.nav-toggle');
  const navClose = document.querySelector('.nav-close');
  const mainNav = document.querySelector('.main-nav');

  const openNav = () => {
    if (!mainNav) return;
    mainNav.classList.add('open');
    document.body.classList.add('nav-open');
    if (navToggle) navToggle.textContent = '✕';
  };
  const closeNav = () => {
    if (!mainNav) return;
    mainNav.classList.remove('open');
    document.body.classList.remove('nav-open');
    if (navToggle) navToggle.textContent = '☰';
  };

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      if (mainNav.classList.contains('open')) closeNav();
      else openNav();
    });
  }
  if (navClose) {
    navClose.addEventListener('click', closeNav);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });
  /* Close menu when a real navigation link (non-dropdown-toggle) is tapped */
  if (mainNav) {
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 980 && !link.parentElement.classList.contains('dropdown')) {
          closeNav();
        }
      });
    });
  }

  /* ---- Mobile dropdown toggles ---- */
  document.querySelectorAll('.dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 980) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  /* ---- Scroll reveal ---- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* ---- Gallery filters (if present) ----
     Bild-Elemente werden bei CMS-gespeisten Seiten erst nach dem Laden von
     _data/fotos.json eingefuegt, darum hier bei jedem Klick frisch abfragen
     statt einmalig beim Start (sonst liefe die Filterung ins Leere). */
  const filterBtns = document.querySelectorAll('.gallery-filters button');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      document.querySelectorAll('.gallery-grid .g-item').forEach(item => {
        if (cat === 'all' || item.dataset.cat === cat) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  /* ---- Active nav link highlight based on current path ---- */
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.main-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.endsWith(path) && path !== '') {
      a.closest('li')?.classList.add('active');
    }
  });
});


/* ============================================================
   Merch-Slider (Startseite)
   - laeuft automatisch endlos weiter
   - Pfeile + freies Scrollen/Wischen
   - pausiert bei Interaktion und ausserhalb des Sichtbereichs
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.querySelector('.merch-slider');
  if (!slider) return;

  const viewport = slider.querySelector('.merch-viewport');
  const track = slider.querySelector('.merch-track');
  const btnPrev = slider.querySelector('.merch-nav.prev');
  const btnNext = slider.querySelector('.merch-nav.next');
  if (!viewport || !track || !track.children.length) return;

  /* Karten einmal klonen -> nahtloser Endlos-Lauf */
  Array.from(track.children).forEach(el => {
    const clone = el.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    track.appendChild(clone);
  });

  const stepWidth = () => {
    const first = track.children[0];
    if (!first) return 220;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 16;
    return first.getBoundingClientRect().width + gap;
  };
  const halfWidth = () => track.scrollWidth / 2;

  const wrap = () => {
    const half = halfWidth();
    if (half <= 0) return;
    if (viewport.scrollLeft >= half) viewport.scrollLeft -= half;
  };

  const go = (dir) => {
    const step = stepWidth();
    if (dir < 0 && viewport.scrollLeft < step) {
      viewport.scrollLeft += halfWidth();
    } else {
      wrap();
    }
    viewport.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;
  let paused = false;
  let visible = true;

  const start = () => {
    if (reduceMotion || timer || paused || !visible || document.hidden) return;
    timer = setInterval(() => go(1), 4000);
  };
  const stop = () => {
    if (timer) { clearInterval(timer); timer = null; }
  };
  const pause = () => { paused = true; stop(); };
  const resume = () => { paused = false; start(); };

  /* Nach manueller Bedienung kurz warten, dann weiterlaufen */
  let resumeTimer = null;
  const pauseThenResume = (ms) => {
    pause();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(resume, ms || 6000);
  };

  if (btnNext) btnNext.addEventListener('click', () => { go(1); pauseThenResume(6000); });
  if (btnPrev) btnPrev.addEventListener('click', () => { go(-1); pauseThenResume(6000); });

  slider.addEventListener('mouseenter', pause);
  slider.addEventListener('mouseleave', resume);
  slider.addEventListener('focusin', pause);
  slider.addEventListener('focusout', resume);
  viewport.addEventListener('touchstart', () => pauseThenResume(7000), { passive: true });
  viewport.addEventListener('wheel', () => pauseThenResume(7000), { passive: true });

  /* Nach manuellem Scrollen Position ggf. zurueckfalten */
  let scrollSettle = null;
  viewport.addEventListener('scroll', () => {
    clearTimeout(scrollSettle);
    scrollSettle = setTimeout(wrap, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
      });
    }, { threshold: 0.15 });
    io.observe(slider);
  }

  start();
});


/* ============================================================
   TERMINE — zentrale Pflegestelle
   Termine werden jetzt aus _data/termine.json geladen (siehe cms-data.js),
   nicht mehr hier hardcodiert. Neue Auftritte kommen per CMS (/admin) oder
   direkt in _data/termine.json hinzu — Countdown-Leiste und Startseite
   laufen automatisch mit.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     1) Termin-Leiste mit Countdown
     ============================================================ */
  (async function gigBar() {
    const root = window.STRONGBOW_DATA_ROOT || './';
    let rohdaten = [];
    try {
      const res = await fetch(root + '_data/termine.json', { cache: 'no-cache' });
      if (res.ok) {
        const daten = await res.json();
        rohdaten = daten.termine || [];
      }
    } catch (e) {
      console.error('Termin-Leiste: termine.json konnte nicht geladen werden', e);
      return;
    }

    const gigs = rohdaten
      .map(g => ({
        ...g,
        date: new Date(window.STRONGBOW_toViennaISO ? window.STRONGBOW_toViennaISO(g.datum, g.uhrzeit) : g.datum + 'T' + g.uhrzeit + ':00')
      }))
      .filter(g => !isNaN(g.date))
      .sort((a, b) => a.date - b.date);

    /* Auftritt gilt bis 4 Stunden nach Beginn als "laeuft gerade" */
    const now = Date.now();
    const next = gigs.find(g => g.date.getTime() + 4 * 3600e3 > now);
    if (!next) return;

    /* Auf der Termine-Seite waere die Leiste doppelt */
    const path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === 'termine.html') return;

    if (sessionStorage.getItem('sb-gigbar-closed') === '1') return;

    /* Pfad zur Termine-Seite aus der vorhandenen Navigation ableiten */
    const navLink = document.querySelector('nav.main-nav a[href$="termine.html"]');
    const termineHref = navLink ? navLink.getAttribute('href') : 'pages/termine.html';

    const fmtTag  = new Intl.DateTimeFormat('de-AT', { weekday: 'short', day: '2-digit', month: 'short' });
    const fmtZeit = new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' });

    const bar = document.createElement('div');
    bar.className = 'gig-bar';
    bar.setAttribute('role', 'complementary');
    bar.setAttribute('aria-label', 'Nächster Auftritt');
    bar.innerHTML =
      '<div class="container gig-bar-inner">' +
        '<span class="gig-label"><span class="pulse"></span>Nächster Auftritt</span>' +
        '<div class="gig-main">' +
          '<div class="gig-title"></div>' +
          '<div class="gig-meta"></div>' +
        '</div>' +
        '<div class="gig-countdown" aria-live="off">' +
          '<div class="unit"><b class="cd-d">–</b><span>Tage</span></div>' +
          '<div class="unit"><b class="cd-h">–</b><span>Std</span></div>' +
          '<div class="unit"><b class="cd-m">–</b><span>Min</span></div>' +
        '</div>' +
        '<a class="btn btn-primary" href="' + termineHref + '">Details<span> ansehen</span></a>' +
        '<button class="gig-close" type="button" aria-label="Leiste schließen">✕</button>' +
      '</div>';

    bar.querySelector('.gig-title').textContent = next.titel;
    bar.querySelector('.gig-meta').textContent =
      fmtTag.format(next.date).replace(/,/g, '') + ' · ' +
      fmtZeit.format(next.date) + ' Uhr · ' + next.ort;

    document.body.appendChild(bar);
    document.body.classList.add('gig-bar-on');

    const dEl = bar.querySelector('.cd-d');
    const hEl = bar.querySelector('.cd-h');
    const mEl = bar.querySelector('.cd-m');
    const cdWrap = bar.querySelector('.gig-countdown');
    const pad = n => String(n).padStart(2, '0');

    const tick = () => {
      const diff = next.date.getTime() - Date.now();
      if (diff <= 0) {
        cdWrap.innerHTML = '<div class="unit" style="min-width:auto;padding:8px 16px;">' +
          '<b style="font-size:1rem;letter-spacing:.08em;">HEUTE</b><span>Live</span></div>';
        return;
      }
      const total = Math.floor(diff / 1000);
      dEl.textContent = Math.floor(total / 86400);
      hEl.textContent = pad(Math.floor(total % 86400 / 3600));
      mEl.textContent = pad(Math.floor(total % 3600 / 60));
    };
    tick();
    const timer = setInterval(tick, 30000);

    bar.querySelector('.gig-close').addEventListener('click', () => {
      bar.classList.remove('show');
      document.body.classList.remove('gig-bar-on');
      clearInterval(timer);
      try { sessionStorage.setItem('sb-gigbar-closed', '1'); } catch (e) {}
      setTimeout(() => bar.remove(), 600);
    });

    /* Auf der Startseite erst nach dem Hero einblenden, sonst kurz verzögert */
    const isHome = !!document.querySelector('.hero');
    if (isHome) {
      const reveal = () => {
        if (window.scrollY > 420) {
          bar.classList.add('show');
          window.removeEventListener('scroll', reveal);
        }
      };
      window.addEventListener('scroll', reveal, { passive: true });
      reveal();
    } else {
      setTimeout(() => bar.classList.add('show'), 900);
    }
  })();


  /* ============================================================
     2) Kennzahlen hochzählen
     ============================================================ */
  (function counters() {
    const nums = document.querySelectorAll('.stat .num');
    if (!nums.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const parse = (txt) => {
      const m = txt.trim().match(/^(\D*?)([\d]+(?:[.,][\d]+)?)(.*)$/);
      if (!m) return null;
      const raw = m[2];
      const komma = raw.indexOf(',') > -1;
      const dez = komma ? raw.split(',')[1].length : (raw.indexOf('.') > -1 ? raw.split('.')[1].length : 0);
      return { pre: m[1], ziel: parseFloat(raw.replace(',', '.')), post: m[3], dez, komma };
    };

    const run = (el) => {
      const p = parse(el.textContent);
      if (!p) return;
      const dauer = 1500;
      const start = performance.now();
      const format = (v) => {
        let s = p.dez ? v.toFixed(p.dez) : String(Math.round(v));
        if (p.komma) s = s.replace('.', ',');
        return p.pre + s + p.post;
      };
      el.textContent = format(0);
      const step = (now) => {
        const t = Math.min(1, (now - start) / dauer);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(p.ziel * eased);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = format(p.ziel);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(n => io.observe(n));
  })();


  /* ============================================================
     3) Lightbox für die Fotogalerie
     ============================================================ */
  (function lightbox() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;

    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Bildansicht');
    lb.innerHTML =
      '<button class="lb-btn lb-close" type="button" aria-label="Schließen">✕</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Vorheriges Bild">‹</button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Nächstes Bild">›</button>' +
      '<figure class="lb-figure">' +
        '<img alt="">' +
        '<figcaption class="lb-cap"><span class="lb-text"></span><span class="lb-count"></span></figcaption>' +
      '</figure>';
    document.body.appendChild(lb);

    const imgEl = lb.querySelector('img');
    const txtEl = lb.querySelector('.lb-text');
    const cntEl = lb.querySelector('.lb-count');
    let liste = [], index = 0, letzterFokus = null;

    /* Nur die aktuell eingeblendeten Bilder (Filter beachten) */
    const sichtbare = () => Array.from(grid.querySelectorAll('.g-item'))
      .filter(el => el.style.display !== 'none')
      .map(el => el.querySelector('img'))
      .filter(Boolean);

    const zeige = (i) => {
      if (!liste.length) return;
      index = (i + liste.length) % liste.length;
      const q = liste[index];
      imgEl.src = q.currentSrc || q.src;
      imgEl.alt = q.alt || '';
      txtEl.textContent = q.alt || '';
      cntEl.textContent = (index + 1) + ' von ' + liste.length;
    };

    const oeffne = (bild) => {
      liste = sichtbare();
      const i = liste.indexOf(bild);
      if (i < 0) return;
      letzterFokus = document.activeElement;
      lb.classList.add('open');
      document.body.classList.add('lb-open');
      document.body.style.overflow = 'hidden';
      zeige(i);
      requestAnimationFrame(() => lb.classList.add('visible'));
      lb.querySelector('.lb-close').focus();
    };

    const schliesse = () => {
      lb.classList.remove('visible');
      document.body.classList.remove('lb-open');
      document.body.style.overflow = '';
      setTimeout(() => { lb.classList.remove('open'); imgEl.src = ''; }, 300);
      if (letzterFokus && letzterFokus.focus) letzterFokus.focus();
    };

    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.g-item');
      if (!item) return;
      const bild = item.querySelector('img');
      if (bild) oeffne(bild);
    });

    lb.querySelector('.lb-close').addEventListener('click', schliesse);
    lb.querySelector('.lb-prev').addEventListener('click', () => zeige(index - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => zeige(index + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) schliesse(); });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') schliesse();
      else if (e.key === 'ArrowLeft') zeige(index - 1);
      else if (e.key === 'ArrowRight') zeige(index + 1);
      else if (e.key === 'Tab') {
        /* Fokus im Dialog halten */
        const f = lb.querySelectorAll('button');
        const erster = f[0], letzter = f[f.length - 1];
        if (e.shiftKey && document.activeElement === erster) { e.preventDefault(); letzter.focus(); }
        else if (!e.shiftKey && document.activeElement === letzter) { e.preventDefault(); erster.focus(); }
      }
    });

    /* Wischen am Handy */
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 55) zeige(index + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  })();


  /* ============================================================
     4) Hero-Videoloop (optional)
     Wird nur verwendet, wenn am <section class="hero"> ein
     data-video="…mp4" gesetzt ist. Das Video ersetzt die Foto-
     Show nur dann, wenn es im Querformat vorliegt, der Besucher
     am Desktop ist und keine Datensparen-Einstellung aktiv hat.
     ============================================================ */
  (function heroVideo() {
    const hero = document.querySelector('.hero[data-video]');
    if (!hero) return;
    const quelle = hero.getAttribute('data-video');
    if (!quelle) return;
    if (window.innerWidth < 900) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const con = navigator.connection;
    if (con && (con.saveData || /2g/.test(con.effectiveType || ''))) return;

    const starte = () => {
      const v = document.createElement('video');
      v.className = 'hero-video';
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.setAttribute('aria-hidden', 'true');
      v.addEventListener('loadedmetadata', () => {
        /* Hochformat würde im Breitbild-Hero unbrauchbar beschnitten */
        if (v.videoWidth <= v.videoHeight) { v.remove(); return; }
        const medien = document.querySelector('.hero-media');
        if (!medien) return;
        medien.appendChild(v);
        v.play().then(() => {
          requestAnimationFrame(() => v.classList.add('on'));
        }).catch(() => v.remove());
      });
      v.addEventListener('error', () => v.remove());
      v.src = quelle;
    };

    if (document.readyState === 'complete') setTimeout(starte, 800);
    else window.addEventListener('load', () => setTimeout(starte, 800));
  })();

});

document.addEventListener('DOMContentLoaded', () => {
  /* ============================================================
     Flug-Animation Kärnten -> Prishtina
     Startet, sobald die Karte im Bild ist; per Knopf wiederholbar.
     ============================================================ */
  const karte = document.querySelector('.mission-map');
  if (!karte) return;

  const flug = karte.querySelector('#flugAnimation');
  const knopf = karte.querySelector('.mission-replay');
  const sparsam = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (sparsam) {
    /* Endzustand ohne Bewegung zeigen */
    karte.classList.add('fliegt');
    if (knopf) knopf.hidden = true;
    return;
  }

  let laeuft = false;
  const starte = () => {
    if (laeuft) return;
    laeuft = true;
    karte.classList.remove('fliegt');
    void karte.offsetWidth;            /* Neustart der CSS-Animationen erzwingen */
    karte.classList.add('fliegt');
    if (flug && typeof flug.beginElement === 'function') {
      try { flug.beginElement(); } catch (e) {}
    }
    setTimeout(() => { laeuft = false; }, 5200);
  };

  if (knopf) knopf.addEventListener('click', starte);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((eintraege) => {
      eintraege.forEach(e => {
        if (e.isIntersecting) { starte(); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    io.observe(karte);
  } else {
    starte();
  }
});
