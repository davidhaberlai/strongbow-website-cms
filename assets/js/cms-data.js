// THE STRONGBOW — cms-data.js
//
// Laedt Inhalte aus den JSON-Dateien in _data/ (Termine, News, Fotos, Texte)
// und fuellt sie zur Laufzeit in die Seite ein. So kann der Eigentuemer diese
// Inhalte spaeter ueber die CMS-Oberflaeche (/admin) pflegen, ohne HTML
// anzufassen — das Design/Markup bleibt exakt dasselbe wie zuvor.
//
// WICHTIG: Muss im HTML VOR main.js eingebunden werden (setzt
// window.STRONGBOW_DATA_ROOT und window.STRONGBOW_toViennaISO, die main.js
// fuer die Termin-Leiste braucht).

(function () {
  var scriptEl = document.currentScript;
  window.STRONGBOW_DATA_ROOT = (scriptEl && scriptEl.getAttribute('data-root')) || './';

  /* Wandelt "2026-10-25" + "20:00" (Wiener Ortszeit) in ein korrektes
     ISO-Datum mit automatisch erkannter Sommer-/Winterzeit um. Kein
     manuelles +02:00/+01:00 mehr noetig — verhindert genau den Fehler, der
     bei einem Termin an einem Tag der Zeitumstellung sonst leicht passiert. */
  window.STRONGBOW_toViennaISO = function (datum, uhrzeit) {
    try {
      var probe = new Date(datum + 'T' + (uhrzeit || '00:00') + ':00Z');
      var teile = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Vienna',
        timeZoneName: 'longOffset'
      }).formatToParts(probe);
      var off = teile.find(function (t) { return t.type === 'timeZoneName'; });
      var offset = (off && off.value) ? off.value.replace('GMT', '') : '';
      if (!offset) offset = '+02:00';
      return datum + 'T' + (uhrzeit || '00:00') + ':00' + offset;
    } catch (e) {
      return datum + 'T' + (uhrzeit || '00:00') + ':00+02:00';
    }
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  const ROOT = window.STRONGBOW_DATA_ROOT || './';

  /* Kleiner eigener Reveal-Beobachter fuer nachtraeglich eingefuegte
     Elemente — main.js hat seine Liste der .reveal-Elemente schon beim
     Start eingelesen, bevor unsere Daten geladen sind. */
  const revealNeu = (el) => {
    if (!('IntersectionObserver' in window)) { el.classList.add('in-view'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    io.observe(el);
  };

  const holeJSON = (name) =>
    fetch(ROOT + '_data/' + name + '.json', { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(name + '.json: HTTP ' + r.status);
      return r.json();
    });

  const escapeHTML = (str) =>
    String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  const mitZeilenumbruch = (str) => escapeHTML(str).replace(/\n/g, '<br>');

  /* ============================================================
     1) TERMINE — index.html (Ausschnitt) + termine.html (alle)
     Container: <div class="event-list" data-cms-termine data-limit="3">
     data-limit="0" (oder weglassen) = alle kommenden Termine anzeigen.
     Vergangene Termine (Datum vor heute) werden automatisch ausgeblendet —
     der Eigentuemer muss sie nicht mehr manuell entfernen.
     ============================================================ */
  (async function renderTermine() {
    const container = document.querySelector('[data-cms-termine]');
    if (!container) return;
    try {
      const alle = (await holeJSON('termine')).termine || [];
      const heuteStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date()); // YYYY-MM-DD
      const kommende = alle
        .filter(g => g.datum >= heuteStr)
        .sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit));

      const limit = parseInt(container.dataset.limit || '0', 10);
      const anzeigen = limit > 0 ? kommende.slice(0, limit) : kommende;

      const fmtMonat = new Intl.DateTimeFormat('de-AT', { month: 'short', timeZone: 'Europe/Vienna' });
      const linkZiel = container.dataset.linkTo || 'kontakt.html';
      const linkText = container.dataset.linkText || 'Details';

      container.innerHTML = anzeigen.map((g, i) => {
        const lokal = new Date(g.datum + 'T00:00:00');
        const tag = lokal.getDate().toString().padStart(2, '0');
        const monat = fmtMonat.format(lokal);
        const eintritt = g.eintritt ? `<span>${escapeHTML(g.eintritt)}</span>` : '';
        return `<div class="event-row reveal reveal-delay-${Math.min(i, 4)}">
          <div class="event-date"><span class="day">${tag}</span><span class="month">${monat} ${lokal.getFullYear()}</span></div>
          <div class="event-info">
            <h3>${escapeHTML(g.titel)}</h3>
            <div class="meta"><span>🕗 ${escapeHTML(g.uhrzeit)} Uhr</span><span>📍 ${escapeHTML(g.ort)}</span>${eintritt}</div>
          </div>
          <a href="${linkZiel}" class="btn btn-outline">${linkText}</a>
        </div>`;
      }).join('');

      container.querySelectorAll('.reveal').forEach(revealNeu);
    } catch (e) {
      console.error('Termine konnten nicht geladen werden:', e);
    }
  })();

  /* ============================================================
     2) NEWS — index.html (Ausschnitt) + news.html (alle)
     Container: <div class="news-grid" data-cms-news data-limit="3">
     Auf der Startseite wird der Text automatisch auf einen kurzen
     Teaser gekuerzt, auf news.html erscheint der volle Text.
     ============================================================ */
  (async function renderNews() {
    const container = document.querySelector('[data-cms-news]');
    if (!container) return;
    try {
      const alle = (await holeJSON('news')).news || [];
      const limit = parseInt(container.dataset.limit || '0', 10);
      const anzeigen = limit > 0 ? alle.slice(0, limit) : alle;
      const kurz = container.dataset.kurz === 'true';
      const linkZiel = container.dataset.linkTo;

      container.innerHTML = anzeigen.map((n, i) => {
        let text = escapeHTML(n.text);
        if (kurz && text.length > 150) {
          const geschnitten = text.slice(0, 150);
          text = geschnitten.slice(0, geschnitten.lastIndexOf(' ')) + '…';
        }
        const weiterlesen = linkZiel ? `<a href="${linkZiel}" class="more">Weiterlesen</a>` : '';
        return `<article class="news-card card reveal reveal-delay-${Math.min(i, 4)}">
          <div class="thumb"><img src="${escapeHTML(n.bild)}" alt="${escapeHTML(n.titel)}" loading="lazy"></div>
          <div class="body">
            <span class="date">${escapeHTML(n.datum)}</span>
            <h3>${escapeHTML(n.titel)}</h3>
            <p>${text}</p>
            ${weiterlesen}
          </div>
        </article>`;
      }).join('');

      container.querySelectorAll('.reveal').forEach(revealNeu);
    } catch (e) {
      console.error('News konnten nicht geladen werden:', e);
    }
  })();

  /* ============================================================
     3) FOTOS — fotos.html Galerie
     Container: <div class="gallery-grid reveal" data-cms-fotos>
     Filter-Buttons (.gallery-filters) bleiben statisches HTML wie bisher.
     ============================================================ */
  (async function renderFotos() {
    const container = document.querySelector('[data-cms-fotos]');
    if (!container) return;
    try {
      const alle = (await holeJSON('fotos')).fotos || [];
      container.innerHTML = alle.map(f =>
        `<div class="g-item" data-cat="${escapeHTML(f.kategorie)}"><img src="${escapeHTML(f.bild)}" alt="${escapeHTML(f.alt)}" loading="lazy"></div>`
      ).join('');

      /* Deep-Link ?cat=... aus der URL beruecksichtigen, jetzt wo die Bilder da sind */
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      if (cat) {
        const btn = document.querySelector('.gallery-filters button[data-filter="' + cat + '"]');
        if (btn) btn.click();
      }
    } catch (e) {
      console.error('Fotos konnten nicht geladen werden:', e);
    }
  })();

  /* ============================================================
     4) TEXTE — Über uns, Biographie, Kontakt-Intro, FAQ
     Einzelfelder: <span data-cms="ueber_uns.lead"></span> (Pfad = Feld in texte.json)
     Biographie-Abschnitte und FAQ sind Listen, eigene Container:
       <div data-cms-bio-abschnitte></div>
       <div data-cms-faq></div>
     ============================================================ */
  (async function renderTexte() {
    const felder = document.querySelectorAll('[data-cms]');
    const bioContainer = document.querySelector('[data-cms-bio-abschnitte]');
    const faqContainer = document.querySelector('[data-cms-faq]');
    if (!felder.length && !bioContainer && !faqContainer) return;

    try {
      const texte = await holeJSON('texte');

      felder.forEach(el => {
        const pfad = el.dataset.cms.split('.');
        let wert = texte;
        for (const teil of pfad) wert = wert && wert[teil];
        if (wert == null) return;
        el.innerHTML = mitZeilenumbruch(wert);
      });

      if (bioContainer && texte.biographie && Array.isArray(texte.biographie.abschnitte)) {
        bioContainer.innerHTML = texte.biographie.abschnitte.map(a => {
          const absaetze = String(a.text || '').split(/\n\s*\n/)
            .map(p => `<p style="margin-bottom:22px;">${escapeHTML(p)}</p>`).join('');
          return `<h3 style="margin:44px 0 16px; color:var(--white);">${escapeHTML(a.titel)}</h3>${absaetze}`;
        }).join('');
      }

      if (faqContainer && Array.isArray(texte.faq)) {
        faqContainer.innerHTML = texte.faq.map(f =>
          `<details class="faq-item">
            <summary>${escapeHTML(f.frage)}</summary>
            <div class="faq-a"><p>${f.antwort}</p></div>
          </details>`
        ).join('');
      }
    } catch (e) {
      console.error('Texte konnten nicht geladen werden:', e);
    }
  })();
});
