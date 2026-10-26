/* =====================================================================
   app.js — MESIN PORTOFOLIO  (kamu tidak perlu mengedit file ini)
   ---------------------------------------------------------------------
   Membaca isi dari content.js lalu membangun:
     • tampilan "Code Editor" dan "Tampilan Ringkas"
     • daftar file, tab, kamus istilah (tooltip), dan Daffa-Agent
   Untuk mengubah ISI, edit content.js. File ini hanya berisi logika.
   ===================================================================== */
(function () {
  'use strict';

  const BASE = window.PORTFOLIO;
  if (!BASE) {
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="margin:5rem 1rem;padding:1rem;border:1px solid #c0392b;border-radius:8px;color:#fff;background:#2a1513;font:14px/1.6 sans-serif">' +
      '<b>content.js tidak terbaca.</b> Pastikan file <code>content.js</code> ada di folder yang sama dengan <code>index.html</code> ' +
      'dan tidak ada tanda kutip / koma yang hilang di dalamnya.</div>');
    return;
  }

  /* ================================================================
     1. HELPER
     ================================================================ */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };
  function icons() { try { if (window.lucide) window.lucide.createIcons(); } catch (e) { /* ikon gagal dimuat, abaikan */ } }
  function jumpTop() {
    const h = document.documentElement, prev = h.style.scrollBehavior;
    h.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); h.style.scrollBehavior = prev;
  }
  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  const isReal = (v) => !!v && !/(@domain\.com|\/username$)/.test(String(v));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const arr = (v) => (Array.isArray(v) ? v : []);

  /* ================================================================
     2. DATA TURUNAN DARI content.js
     ================================================================ */
  /* ---- bahasa: content.js = Indonesia (dasar), content.en.js = penimpa bahasa Inggris ---- */
  const I18N = window.I18N || { id: {}, en: {} };
  let LANG = 'id';
  let C, P, CT, AG, FIRST, AGENT_NAME, CONFIG, SKILLS, CERTS, TIPS, GREETING, SUGGEST, hidden;
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  /* gabung: objek digabung per kunci; array berisi objek digabung per urutan; array teks & nilai lain diganti */
  function deepMerge(base, over, replaceKeys, key) {
    if (over === undefined) return base;
    if (replaceKeys && replaceKeys.indexOf(key) !== -1) return over;
    if (isObj(base) && isObj(over)) {
      const out = Object.assign({}, base);
      Object.keys(over).forEach((k) => { out[k] = deepMerge(base[k], over[k], replaceKeys, k); });
      return out;
    }
    if (Array.isArray(base) && Array.isArray(over) && over.length && over.every(isObj) && base.every(isObj)) {
      const n = Math.max(base.length, over.length), out = [];
      for (let i = 0; i < n; i++) out[i] = i < over.length ? (i < base.length ? deepMerge(base[i], over[i], replaceKeys, key) : over[i]) : base[i];
      return out;
    }
    return over;
  }
  function loadData(lang) {
    LANG = lang === 'en' && window.PORTFOLIO_EN ? 'en' : 'id';
    C = LANG === 'en' ? deepMerge(BASE, window.PORTFOLIO_EN, ['glossary']) : BASE;
    P = C.profile || {}; CT = C.contact || {}; AG = C.agent || {};
    FIRST = P.firstName || String(P.name || '').split(' ')[0] || 'Saya';
    AGENT_NAME = AG.name || (FIRST + '-Agent');
    CONFIG = Object.assign({}, CT, { agent: AG });
    SKILLS = arr(C.skills && C.skills.groups);
    CERTS = arr(C.certificates && C.certificates.groups);
    TIPS = C.glossary || {};
    GREETING = AG.greeting || ('Halo! Saya **' + AGENT_NAME + '**, asisten di portofolio ini.');
    SUGGEST = arr(AG.suggestions);
    hidden = new Set(arr(C.hide));
    buildGlossary();
  }
  /* terjemahan teks antarmuka: T('kunci', {var: nilai}); {agent} {first} {name} selalu tersedia */
  function T(key, vars) {
    let t = (I18N[LANG] || {})[key];
    if (t == null) t = (I18N.id || {})[key];
    if (t == null) return key;
    const v = Object.assign({ agent: AGENT_NAME, first: FIRST, name: P.name || '', brand: String((C.site && C.site.titleBar) || '').split(' — ')[0] || 'portfolio' }, vars || {});
    return t.replace(/\{(\w+)\}/g, (m, k) => (v[k] == null ? m : v[k]));
  }
  const waHref = () => (CT.whatsapp ? 'https://wa.me/' + CT.whatsapp : '');
  const mailHref = () => (isReal(CT.email) ? 'mailto:' + CT.email : '');
  let FILES = [];        // item daftar file / tab (diisi buildModel)
  let READER_NAV = [];   // pil navigasi tampilan ringkas
  let MODEL = [];        // urutan bagian halaman

  /* ================================================================
     3. TEKS KAYA: **tebal**, *miring*, baris baru, + penanda istilah otomatis
     ================================================================ */
  let GL = {}, glRe = null;
  function buildGlossary() {
    GL = {};
    Object.keys(TIPS).forEach((k) => { GL[k.toLowerCase()] = TIPS[k]; });
    const glKeys = Object.keys(TIPS).sort((a, b) => b.length - a.length);
    glRe = glKeys.length ? new RegExp('(^|[^\\w])(' + glKeys.map(reEsc).join('|') + ')(?![\\w])', 'gi') : null;
  }

  function wrapTerms(text, seen) {
    if (!glRe || !seen) return esc(text);
    let out = '', last = 0, m;
    glRe.lastIndex = 0;
    while ((m = glRe.exec(text))) {
      const term = m[2], start = m.index + m[1].length, low = term.toLowerCase();
      if (seen.has(low) || !GL[low]) continue;
      out += esc(text.slice(last, start)) + '<span class="term" tabindex="0" data-tip="' + esc(GL[low]) + '">' + esc(term) + '</span>';
      last = start + term.length; seen.add(low);
    }
    return out + esc(text.slice(last));
  }
  function italics(s, seen) {
    return s.split(/(\*[^*\n]+\*)/).map((b) => (/^\*[^*\n]+\*$/.test(b) ? '<i>' + wrapTerms(b.slice(1, -1), seen) + '</i>' : wrapTerms(b, seen))).join('');
  }
  function rich(text, noTerms) {
    text = String(text == null ? '' : text);
    const seen = noTerms ? null : new Set();
    return text.split(/(\*\*[^*]+\*\*)/).map((p) =>
      (/^\*\*[^*]+\*\*$/.test(p) ? '<b>' + italics(p.slice(2, -2), seen) + '</b>' : italics(p, seen))
    ).join('').replace(/\n/g, '<br>');
  }
  const plain = (t) => String(t == null ? '' : t).replace(/\*\*/g, '').replace(/\*([^*\n]+)\*/g, '$1');
  const tipFor = (name, explicit) => explicit || GL[String(name).toLowerCase()] || '';
  const tipAttr = (tip) => (tip ? ' tabindex="0" data-tip="' + esc(tip) + '"' : '');

  /* ================================================================
     4. VALIDASI ISI (membantu menemukan salah ketik di content.js)
     ================================================================ */
  function checkContent() {
    const w = [];
    if (!P.name) w.push('profile.name kosong');
    if (!arr(C.projects).length) w.push('projects kosong — belum ada proyek');
    arr(C.projects).forEach((p, i) => {
      const at = 'projects[' + i + ']' + (p && p.title ? ' (' + p.title + ')' : '');
      if (!p || !p.title) w.push(at + ': title kosong');
      if (p && !p.file) w.push(at + ': file kosong');
      ['problem', 'method', 'result', 'impact'].forEach((k) => { if (p && !p[k]) w.push(at + ': ' + k + ' kosong'); });
      arr(p && p.metrics).forEach((m, j) => { if (typeof m.value !== 'number') w.push(at + ': metrics[' + j + '].value harus angka tanpa tanda kutip'); });
    });
    const files = {};
    arr(C.projects).forEach((p) => { if (p && p.file) { if (files[p.file]) w.push('nama file ganda: ' + p.file); files[p.file] = 1; } });
    SKILLS.forEach((g, i) => { if (!arr(g.items).length) w.push('skills.groups[' + i + '] tidak punya items'); });
    arr(C.hide).forEach((h) => { if (['about', 'skills', 'ai', 'experience', 'education', 'certificates'].indexOf(h) === -1) w.push('hide: "' + h + '" tidak dikenal'); });
    arr(C.extra).forEach((x, i) => { if (!x || !x.id || !x.title) w.push('extra[' + i + ']: id & title wajib diisi'); });
    arr(CERTS).forEach((g) => arr(g.items).forEach((c) => { if (!c.f) w.push('sertifikat "' + c.t + '" belum punya file (f)'); }));
    return w;
  }

  /* ================================================================
     5. MODEL BAGIAN HALAMAN (urutan, nama file, label)
     ================================================================ */
  function buildModel() {
    const list = [];
    const add = (s) => { if (!hidden.has(s.id)) list.push(s); };
    add({ id: 'hero', type: 'hero', file: 'hero.tsx', sub: T('s_home'), label: T('l_home'), icon: 'file-code', color: 'text-accent', kw: 'beranda home awal foto profil photo' });
    add({ id: 'about', type: 'about', file: 'about.md', sub: T('s_about'), label: T('l_about'), icon: 'file-text', color: 'text-dim', kw: 'tentang profil bio siapa about who' });
    add({ id: 'skills', type: 'skills', file: 'skills.json', sub: T('s_skills'), label: T('l_skills'), icon: 'braces', color: 'text-[#cbcb41]', kw: 'keahlian skill skills tools teknologi kemampuan technology' });
    arr(C.projects).forEach((p, i) => {
      if (!p || p.show === false) return;
      const n = i + 1;
      add({ id: 'project-' + pad2(n), type: 'project', p: p, n: n, lang: /\.py$/i.test(p.file || '') ? 'py' : 'js', file: p.file || ('proyek-' + n + '.js'),
            sub: T('project') + ' ' + n + (p.short ? ' · ' + p.short : ''), label: T('project') + ' ' + n, icon: 'file-code', child: true,
            color: p.color || (/\.py$/i.test(p.file || '') ? 'text-teal' : 'text-[#cbcb41]'),
            kw: 'proyek project dokumentasi documentation ' + (p.keywords || '') + ' ' + (p.title || '') });
    });
    if (C.ai) add({ id: 'ai', type: 'ai', file: C.ai.file || 'ai_agent.py', sub: T('s_ai'), label: T('l_ai'), icon: 'file-code', color: 'text-teal', kw: 'ai agent engineer llm karier career rag arah' });
    if (C.experience) add({ id: 'experience', type: 'experience', file: C.experience.file || 'experience.log', sub: T('s_exp'), label: T('l_exp'), icon: 'file-text', color: 'text-dim', kw: 'pengalaman kerja logistik pekerjaan experience work job' });
    if (C.education) add({ id: 'education', type: 'education', file: C.education.file || 'education.md', sub: T('s_edu'), label: T('l_edu'), icon: 'file-text', color: 'text-dim', kw: 'pendidikan kuliah sekolah gunadarma ipk skripsi education school gpa thesis' });
    if (C.certificates) add({ id: 'certificates', type: 'certificates', file: C.certificates.file || 'certificates.json', sub: T('s_cert'), label: T('l_cert'), icon: 'braces', color: 'text-[#cbcb41]', kw: 'sertifikat sertifikasi pelatihan training certificate oracle go' });
    // bagian tambahan: disisipkan setelah bagian yang diminta (default: sebelum kontak)
    arr(C.extra).forEach((x) => {
      if (!x || !x.id || !x.title || x.show === false) return;
      const s = { id: x.id, type: 'extra', x: x, file: x.file || (x.id + '.md'), sub: x.sub || x.title, label: x.label || x.sub || x.title, icon: 'file-text', color: 'text-dim', kw: x.title + ' ' + (x.keywords || '') };
      let at = list.findIndex((m) => m.id === x.after);
      at = at === -1 ? list.length : at + 1;
      list.splice(at, 0, s);
    });
    add({ id: 'contact', type: 'contact', file: 'contact.json', sub: T('s_contact'), label: T('l_contact'), icon: 'braces', color: 'text-[#cbcb41]', kw: 'kontak hubungi email whatsapp telepon contact github' });

    MODEL = list;
    FILES = []; READER_NAV = [];
    let folderDone = false;
    list.forEach((s) => {
      if (s.child && !folderDone) { FILES.push({ folder: 'projects', sub: T('folder_projects') }); folderDone = true; }
      FILES.push({ id: s.id, name: s.file, sub: s.sub, icon: s.icon, color: s.color, child: !!s.child, kw: s.kw });
      READER_NAV.push({ id: s.id, label: s.label });
    });
  }

  /* ================================================================
     6. POTONGAN MARKUP YANG DIPAKAI BERULANG
     ================================================================ */
  const ico = (name, cls) => '<i data-lucide="' + name + '" class="' + cls + '"></i>';
  const ghIcon = (cls) => '<svg class="' + cls + ' fill-current"><use href="#i-github"/></svg>';
  const liIcon = (cls) => '<svg class="' + cls + ' fill-current"><use href="#i-linkedin"/></svg>';
  const IDE_CLS = 'px-5 sm:px-8 py-10 border-b border-line/60 max-w-4xl';
  const wrap = (tag, id, cls, inner) => '<' + tag + ' id="' + id + '" class="' + cls + '">' + inner + '</' + tag + '>';
  const head = (kind, file, extra) => '<div class="reveal sec-head"><span class="badge">' + kind + '</span><span class="fname">' + esc(file) + '</span>' + (extra || '') + '</div>';
  const secTitle = (t) => '<h2 class="reveal sec-title">' + esc(t) + '</h2>';
  const helpBox = (t) => (t ? '<div class="reveal helpbox">' + ico('lightbulb', 'w-4 h-4') + '<div>' + rich(t) + '</div></div>' : '');
  const line = (cls, inner) => '<div class="code-line' + (cls ? ' ' + cls : '') + '">' + inner + '</div>';
  const blank = () => '<div class="code-line blank"></div>';
  const kStr = (k, v) => '<span class="tok-key">' + esc(k) + '</span>: <span class="tok-str">"' + esc(v) + '"</span>';
  const chipIDE = (t) => { const tip = tipFor(t); return '<span class="px-2 py-0.5 rounded bg-panel border border-line text-str' + (tip ? ' tip' : '') + '"' + tipAttr(tip) + '>"' + esc(t) + '"</span>'; };
  const chipReader = (t) => { const tip = tipFor(t); return '<span class="r-chip' + (tip ? ' tip' : '') + '"' + tipAttr(tip) + '>' + esc(t) + '</span>'; };
  const countSpan = (m, cls) => '<span class="' + cls + ' count-up" data-count="' + m.value + '"' + (m.decimals ? ' data-decimals="' + m.decimals + '"' : '') + (m.suffix ? ' data-suffix="' + esc(m.suffix) + '"' : '') + '>0</span>';

  function nextLink(sec) {
    const i = MODEL.indexOf(sec), n = MODEL[i + 1];
    if (!n) {
      const h = MODEL[0];
      return '<a href="#' + h.id + '" class="next-link reveal">' + ico('arrow-up', 'w-3.5 h-3.5') + ' <span class="dim">' + esc(T('back_to')) + '</span> ' + esc(h.file) + ' — ' + esc(T('page_top')) + '</a>';
    }
    return '<a href="#' + n.id + '" class="next-link reveal"><span class="dim">' + esc(T('next')) + '</span> ' + esc(n.file) + ' — ' + esc(n.sub) + ' ' + ico('arrow-right', 'w-3.5 h-3.5') + '</a>';
  }
  function photoImg() {
    return '<img src="' + esc(CT.photo || '') + '" width="640" height="833" decoding="async" alt="' + esc(T('photo_alt')) + '" class="w-full h-full object-cover"' +
      (CT.photoPosition ? ' style="object-position:' + esc(CT.photoPosition) + '"' : '') +
      ' onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
      '<div class="w-full h-full items-center justify-center text-dim" style="display:none;">' + ico('user-round', 'w-16 h-16') + '</div>';
  }
  function linkBtnsIDE(links, extra, docs) {
    const out = [];
    if (links && links.github) out.push('<a href="' + esc(links.github) + '" target="_blank" rel="noopener" class="px-3.5 py-2 text-xs font-medium rounded-md border border-line hover:border-accent hover:text-white flex items-center gap-2">' + ghIcon('w-4 h-4') + ' ' + T('btn_github') + '</a>');
    if (links && links.demo) out.push('<a href="' + esc(links.demo) + '" target="_blank" rel="noopener" class="px-3.5 py-2 text-xs font-medium rounded-md bg-accentfill hover:bg-accent text-white flex items-center gap-2">' + ico('external-link', 'w-4 h-4') + ' ' + T('btn_demo') + '</a>');
    if (extra && extra.goto) out.push('<a href="#' + esc(extra.goto) + '" class="px-3.5 py-2 text-xs font-medium rounded-md border border-line hover:border-accent hover:text-white flex items-center gap-2">' + ico('arrow-right', 'w-4 h-4') + ' ' + esc(extra.label || T('btn_more')) + '</a>');
    if (docs && docs.pdf) out.push('<a href="' + esc(docs.pdf) + '" target="_blank" rel="noopener" class="px-3.5 py-2 text-xs font-medium rounded-md border border-ok/40 text-ok hover:bg-ok/10 flex items-center gap-2">' + ico('file-text', 'w-4 h-4') + ' ' + T('btn_docs_pdf') + '</a>');
    return out.length ? '<div class="reveal flex flex-wrap gap-3 mt-6 pt-5 border-t border-line/60 font-ui">' + out.join('') + '</div>' : '';
  }
  function linkBtnsReader(links, extra, docs) {
    const out = [];
    if (links && links.github) out.push('<a href="' + esc(links.github) + '" target="_blank" rel="noopener" class="px-3.5 py-2 text-sm rounded-md border border-line hover:border-accent hover:text-white flex items-center gap-2">' + ghIcon('w-4 h-4') + ' ' + T('btn_github') + '</a>');
    if (links && links.demo) out.push('<a href="' + esc(links.demo) + '" target="_blank" rel="noopener" class="px-3.5 py-2 text-sm rounded-md bg-accentfill hover:bg-accent text-white flex items-center gap-2">' + ico('external-link', 'w-4 h-4') + ' ' + T('btn_demo') + '</a>');
    if (extra && extra.goto) out.push('<a href="#r-' + esc(extra.goto) + '" class="px-3.5 py-2 text-sm rounded-md border border-line hover:border-accent hover:text-white flex items-center gap-2">' + ico('arrow-right', 'w-4 h-4') + ' ' + esc(extra.label || T('btn_more')) + '</a>');
    if (docs && docs.pdf) out.push('<a href="' + esc(docs.pdf) + '" target="_blank" rel="noopener" class="px-3.5 py-2 text-sm rounded-md border border-ok/40 text-ok hover:bg-ok/10 flex items-center gap-2">' + ico('file-text', 'w-4 h-4') + ' ' + T('btn_docs_pdf') + '</a>');
    return out.length ? '<div class="flex flex-wrap gap-3 mt-5 pt-5 border-t border-line">' + out.join('') + '</div>' : '';
  }

  /* ---- blok dokumentasi proyek: ringkasan, temuan, galeri gambar (klik = perbesar), batasan ---- */
  function docsHTML(d, pid) {
    if (!d) return '';
    const list = (a) => arr(a).map((t) => '<li>' + rich(t) + '</li>').join('');
    const facts = arr(d.facts).map((f) => '<div class="docs-fact"><p class="k">' + esc(f.label) + '</p><p class="v">' + esc(f.value) + '</p></div>').join('');
    const groups = arr(d.groups).map((g) => '<div class="docs-g">' + (g.count ? '<span class="cnt">' + esc(g.count) + '</span>' : '') + '<h4>' + esc(g.title) + '</h4><p>' + rich(g.text) + '</p></div>').join('');
    const figs = arr(d.figures).map((f, i) =>
      '<div class="docs-fig"><button type="button" class="thumb' + (f.fit === 'top' ? ' top' : '') + '" data-lb="' + esc(pid) + '" data-i="' + i + '" aria-label="' + esc(T('docs_open_fig') + ': ' + f.caption) + '">' +
      '<img src="' + esc(f.src) + '" alt="' + esc(f.caption) + '" loading="lazy" decoding="async"><span class="zoom">' + ico('maximize-2', 'w-3.5 h-3.5') + '</span></button>' +
      '<p class="cap">' + esc(f.caption) + '</p>' + (f.note ? '<p class="note">' + esc(f.note) + '</p>' : '') + '</div>').join('');
    const colour = (l) => esc(l).replace(/(FAILED|ERROR)/g, '<span class="bad">$1</span>').replace(/(SUCCESS|PASS|COMPLETE)/g, '<span class="good">$1</span>');
    return '<div class="docs reveal" id="docs-' + esc(pid) + '">' +
      '<div class="docs-head"><div><p class="docs-kicker">' + esc(T('docs_kicker')) + '</p><h3 class="docs-title">' + esc(d.title || '') + '</h3></div>' +
        (d.pdf ? '<div class="docs-actions"><a class="docs-pdf" href="' + esc(d.pdf) + '" target="_blank" rel="noopener">' + ico('file-text', 'w-4 h-4') + ' ' + esc(T('docs_open_pdf')) + (d.pdfInfo ? ' <span>' + esc(d.pdfInfo) + '</span>' : '') + '</a>' +
          '<a class="docs-dl" href="' + esc(d.pdf) + '" download aria-label="' + esc(T('docs_dl')) + '" title="' + esc(T('docs_dl')) + '">' + ico('download', 'w-4 h-4') + '</a></div>' : '') + '</div>' +
      (d.scope ? '<p class="docs-scope">' + esc(d.scope) + '</p>' : '') +
      (d.summary ? '<p class="docs-summary">' + rich(d.summary) + '</p>' : '') +
      (facts ? '<div class="docs-facts">' + facts + '</div>' : '') +
      (groups ? '<h4 class="docs-h">' + esc(d.groupsTitle || '') + '</h4><div class="docs-groups">' + groups + '</div>' : '') +
      (d.callout ? '<div class="docs-callout"><h4>' + esc(d.callout.title) + '</h4><p>' + rich(d.callout.text) + '</p></div>' : '') +
      (arr(d.findings).length ? '<h4 class="docs-h">' + esc(d.findingsTitle || '') + '</h4><ul class="docs-list">' + list(d.findings) + '</ul>' : '') +
      (arr(d.snippet).length ? '<h4 class="docs-h">' + esc(d.snippetTitle || T('docs_snip')) + '</h4>' + (d.snippetNote ? '<p class="docs-note">' + esc(d.snippetNote) + '</p>' : '') + '<pre class="docs-snip">' + arr(d.snippet).map(colour).join('\n') + '</pre>' : '') +
      (figs ? '<h4 class="docs-h">' + esc(d.figuresTitle || '') + ' <span class="docs-count">' + arr(d.figures).length + ' ' + esc(T('docs_figs')) + '</span></h4>' + (d.figNote ? '<p class="docs-note">' + esc(d.figNote) + '</p>' : '') + '<div class="docs-gal">' + figs + '</div>' : '') +
      ((arr(d.limits).length || arr(d.next).length) ? '<details class="docs-more"><summary>' + esc(T('docs_more')) + '</summary><div class="docs-cols">' +
        (arr(d.limits).length ? '<div><h4>' + esc(d.limitsTitle || '') + '</h4><ul class="docs-list">' + list(d.limits) + '</ul></div>' : '') +
        (arr(d.next).length ? '<div><h4>' + esc(d.nextTitle || '') + '</h4><ul class="docs-list">' + list(d.next) + '</ul></div>' : '') + '</div></details>' : '') +
      '</div>';
  }

  /* ================================================================
     7. RENDERER — TAMPILAN CODE EDITOR
     ================================================================ */
  function ideHero(sec) {
    const firstProj = MODEL.find((s) => s.type === 'project');
    const d = (t) => ' style="animation-delay:' + t + 's"';
    const chips = (list, cls) => arr(list).map((t) => '<span class="px-2 py-0.5 rounded ' + cls + ' text-xs">"' + esc(t) + '"</span>').join('');
    const status = P.openToWork === false ? 'busy' : 'open_to_work';
    return wrap('section', 'hero', 'px-5 sm:px-8 py-10 border-b border-line/60',
      '<div class="helpbox max-w-5xl hero-in"' + d(0.02) + '>' + ico('lightbulb', 'w-4 h-4') + '<div>' +
        '<b>' + esc(T('hero_help_t')) + '</b>' + esc(T('hero_help_a')) +
        '<button data-action="mode-reader" class="underline text-accent hover:text-white">' + esc(T('reader_view')) + '</button>' + esc(T('hero_help_b')) +
        '<button data-action="open-agent" class="underline text-accent hover:text-white">' + esc(AGENT_NAME) + '</button>.</div></div>' +
      '<div class="grid md:grid-cols-12 gap-10 items-start max-w-5xl">' +
        '<div class="hero-in md:col-span-4"' + d(0.05) + '>' +
          '<div class="border border-line rounded-t-md bg-panel px-3 py-1.5 flex items-center gap-2 text-[11px] text-dim font-mono">' + ico('image', 'w-3.5 h-3.5') + ' avatar.jpg</div>' +
          '<div class="border border-t-0 border-line rounded-b-md p-4 bg-sidebar">' +
            '<div class="relative w-full aspect-square rounded-md overflow-hidden bg-panel border border-line float-slow">' + photoImg() + '</div>' +
            (P.openToWork === false ? '' : '<p class="mt-3 text-[11px] font-mono text-dim flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-ok"></span> status: open to work</p>') +
          '</div></div>' +
        '<div class="md:col-span-8 code-block text-[13px] sm:text-sm">' +
          '<div class="hero-in code-line"' + d(0.1) + '><span class="tok-cmt">/**</span></div>' +
          '<div class="hero-in code-line"' + d(0.14) + '><span class="tok-cmt"> * Developer Profile — ' + esc(P.name) + '</span></div>' +
          '<div class="hero-in code-line"' + d(0.18) + '><span class="tok-cmt"> */</span></div>' +
          '<div class="hero-in code-line"' + d(0.22) + '><span class="tok-kw2">import</span> Portfolio <span class="tok-kw2">from</span> <span class="tok-str">\'./' + esc(String(FIRST).toLowerCase()) + '\'</span>;</div>' +
          '<div class="hero-in code-line blank"' + d(0.24) + '></div>' +
          '<div class="hero-in code-line"' + d(0.26) + '><span class="tok-kw2">export default function</span> <span class="tok-fn">Hero</span>() {</div>' +
          '<div class="hero-in code-line ind1"' + d(0.3) + '><span class="tok-kw">const</span> dev = {</div>' +
          '<div class="hero-in code-line ind2"' + d(0.34) + '><span class="tok-key">name</span>:</div>' +
          '<h1 class="hero-in font-mono font-extrabold text-ink leading-[1.05] tracking-tight text-3xl sm:text-4xl md:text-[2.6rem] mt-1 mb-3 pl-[5.75rem]"' + d(0.38) + '>"' + esc(P.name) + '"<span class="text-dim text-xl">,</span></h1>' +
          '<div class="hero-in code-line ind2"' + d(0.42) + '><span class="tok-key">role</span>: <span class="tok-str">"<span id="role-text"></span><span class="cursor-blink"></span>"</span>,</div>' +
          (arr(P.focus).length ? '<div class="hero-in code-line ind2"' + d(0.46) + '><span class="tok-key">focus</span>: [</div><div class="hero-in code-line ind3 flex flex-wrap gap-2 py-1"' + d(0.5) + '>' + chips(P.focus, 'bg-panel border border-line text-str') + '</div><div class="hero-in code-line ind2"' + d(0.52) + '>],</div>' : '') +
          (arr(P.next).length ? '<div class="hero-in code-line ind2"' + d(0.54) + '><span class="tok-key">' + esc(T('kw_next')) + '</span>: [</div><div class="hero-in code-line ind3 flex flex-wrap gap-2 py-1"' + d(0.56) + '>' + chips(P.next, 'border border-accent/50 bg-accent/10 text-accent') + '</div><div class="hero-in code-line ind2"' + d(0.58) + '>],</div>' : '') +
          (P.educationShort ? '<div class="hero-in code-line ind2"' + d(0.6) + '>' + kStr('education', P.educationShort) + ',</div>' : '') +
          '<div class="hero-in code-line ind2"' + d(0.62) + '>' + kStr('status', status) + '</div>' +
          '<div class="hero-in code-line ind1"' + d(0.64) + '>};</div>' +
          '<div class="hero-in code-line blank"' + d(0.65) + '></div>' +
          '<div class="hero-in code-line ind1"' + d(0.66) + '><span class="tok-kw2">return</span> &lt;<span class="tok-tag">Profile</span> {...dev} /&gt;;</div>' +
          '<div class="hero-in code-line"' + d(0.7) + '>}</div>' +
          '<div class="hero-in flex flex-wrap gap-3 mt-7"' + d(0.78) + '>' +
            '<a href="' + (firstProj ? '#' + firstProj.id : '#about') + '" class="px-4 py-2 bg-accentfill hover:bg-accent text-white text-xs font-mono rounded flex items-center gap-2">' + ico('terminal', 'w-3.5 h-3.5') + ' ' + esc(T('cmd_projects')) + '</a>' +
            (CT.cv ? '<a href="' + esc(CT.cv) + '" download class="px-4 py-2 border border-line hover:border-accent text-ink text-xs font-mono rounded flex items-center gap-2">' + ico('download', 'w-3.5 h-3.5') + ' ' + esc(T('cmd_cv')) + '</a>' : '') +
            '<a href="#contact" class="px-4 py-2 text-dim hover:text-accent text-xs font-mono rounded flex items-center gap-2">' + ico('terminal', 'w-3.5 h-3.5') + ' ' + esc(T('cmd_contact')) + '</a>' +
          '</div>' +
          '<div class="hero-in mt-6 pt-5 border-t border-line/60"' + d(0.86) + '>' +
            '<p class="font-ui text-xs text-dim mb-2.5">' + esc(T('hero_nonprog')) + '</p>' +
            '<div class="flex flex-wrap gap-2.5 font-ui">' +
              '<button data-action="mode-reader" class="px-3.5 py-2 rounded-md text-xs font-medium bg-ok/15 text-ok border border-ok/40 hover:bg-ok/25 flex items-center gap-2">' + ico('book-open', 'w-3.5 h-3.5') + ' ' + esc(T('read_reader')) + '</button>' +
              '<button data-action="open-agent" class="px-3.5 py-2 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/40 hover:bg-accent/20 flex items-center gap-2">' + ico('bot', 'w-3.5 h-3.5') + ' ' + esc(T('ask_agent')) + '</button>' +
              '<button data-action="start-tour" class="px-3.5 py-2 rounded-md text-xs font-medium text-dim border border-line hover:text-white hover:border-dim flex items-center gap-2">' + ico('info', 'w-3.5 h-3.5') + ' ' + esc(T('tour_btn')) + '</button>' +
            '</div></div>' +
        '</div></div>' + nextLink(sec));
  }

  function ideAbout(sec) {
    const a = C.about || {};
    const fm = [['name', P.name], ['role', P.headline], [T('kw_next'), arr(P.next).join(' & ')], ['location', P.location], ['education', P.education]]
      .filter((r) => r[1]).map((r) => line('', '<span class="tok-key">' + r[0] + '</span>: <span class="tok-str">' + esc(r[1]) + '</span>')).join('');
    const stats = arr(a.stats).map((s) => {
      const tip = tipFor(s.key, s.tip);
      const key = '<span class="tok-key' + (tip ? ' term' : '') + '"' + tipAttr(tip) + '>' + esc(s.key) + '</span>';
      const val = typeof s.value === 'number' ? countSpan(s, 'tok-num') : '<span class="tok-str">' + esc(s.display) + '</span>';
      return line('', key + ': ' + val);
    }).join('');
    const paras = arr(a.paragraphs).map((t, i, all) => '<p class="reveal md-p ' + (i === all.length - 1 ? 'mb-8' : 'mb-4') + '">' + rich(t) + '</p>').join('');
    const strengths = arr(a.strengths).map((s) => '<p class="md-p flex gap-2"><span class="text-accent">-</span> <span><b>' + esc(s.title) + '</b> — ' + rich(s.text) + '</span></p>').join('');
    return wrap('section', 'about', IDE_CLS,
      head('PREVIEW', sec.file) + secTitle(a.title || 'Tentang Saya') + helpBox(a.help) +
      '<div class="reveal code-block text-xs sm:text-[13px] border border-line rounded-md bg-panel/50 p-4 mb-8">' +
        line('', '<span class="tok-cmt">---</span>') + fm + stats + line('', '<span class="tok-cmt">---</span>') + '</div>' +
      '<h1 class="reveal md-h1 mb-4"># ' + esc(a.title || 'Tentang Saya') + '</h1>' + paras +
      (strengths ? '<h2 class="reveal md-h2 mb-4">## ' + esc(a.strengthsTitle || 'Yang Saya Bawa') + '</h2><div data-stagger class="space-y-3">' + strengths + '</div>' : '') +
      nextLink(sec));
  }

  function ideSkills(sec) {
    const s = C.skills || {};
    let h = line('', '{');
    SKILLS.forEach((g, i) => {
      h += line('ind1', '<span class="tok-key">"' + esc(g.key || g.title) + '"</span>: [');
      h += line('ind2 flex flex-wrap gap-1.5 py-1', arr(g.items).map(chipIDE).join(''));
      h += line('ind1', ']' + (i < SKILLS.length - 1 ? ',' : ''));
    });
    h += line('', '}');
    return wrap('section', 'skills', IDE_CLS,
      head('SOURCE', sec.file) + secTitle(s.title || 'Keahlian & Tools') + helpBox(s.help) +
      '<div data-stagger class="code-block text-xs sm:text-[13px]">' + h + '</div>' + nextLink(sec));
  }

  function ideProject(sec) {
    const p = sec.p, py = sec.lang === 'py', n = pad2(sec.n);
    const L = [];
    const para = (key, text) => { L.push(line('ind1', '<span class="tok-key">' + key + '</span>:'), line('ind2 text-ink/90', rich(text)), blank()); };
    if (py) {
      L.push(line('', '<span class="tok-cmt">"""</span>'), line('', '<span class="tok-cmt">Case Study ' + n + ' — ' + esc(p.category || '') + '</span>'),
             line('', '<span class="tok-cmt">"""</span>'), line('', '<span class="tok-kw2">class</span> <span class="tok-cls">' + esc(p.name || 'Proyek') + '</span>:'));
    } else {
      L.push(line('', '<span class="tok-cmt">/**</span>'), line('', '<span class="tok-cmt"> * Case Study ' + n + ' — ' + esc(p.category || '') + '</span>'),
             line('', '<span class="tok-cmt"> */</span>'), line('', '<span class="tok-kw">function</span> <span class="tok-fn">' + esc(p.name || 'proyek') + '</span>() {'));
    }
    const infoKeys = Object.keys(p.info || {});
    if (infoKeys.length) {
      const v = esc(p.infoVar || 'info');
      L.push(line('ind1', py
        ? '<span class="tok-key">' + v + '</span> = { ' + infoKeys.map((k) => '<span class="tok-str">"' + esc(k) + '"</span>: <span class="tok-str">"' + esc(p.info[k]) + '"</span>').join(', ') + ' }'
        : '<span class="tok-kw">const</span> ' + v + ' = { ' + infoKeys.map((k) => kStr(k, p.info[k])).join(', ') + ' };'), blank());
    }
    if (p.problem) para('problem', p.problem);
    if (p.method) para('method', p.method);
    const metrics = arr(p.metrics), facts = Object.keys(p.facts || {});
    if (metrics.length || facts.length) {
      L.push(line('ind1', '<span class="tok-key">result</span>: {'));
      if (metrics.length) {
        L.push(line('ind2 flex flex-wrap gap-x-4 gap-y-1 py-1', metrics.map((m) => {
          const tip = tipFor(m.label || m.key, m.tip);
          return '<span><span class="tok-key' + (tip ? ' term' : '') + '"' + tipAttr(tip) + '>' + esc(m.key) + '</span>: ' + countSpan(m, 'tok-num') + ',</span>';
        }).join('')));
      }
      if (facts.length) {
        const cmt = p.factNote ? '  <span class="tok-cmt">' + (py ? '# ' : '// ') + esc(p.factNote) + '</span>' : '';
        L.push(line('ind2', facts.map((k) => kStr(k, p.facts[k])).join(', ') + cmt));
      }
      L.push(line('ind1', '},'), blank());
    } else if (p.result) { para('result', p.result); }
    if (p.impact) para('impact', p.impact);
    if (p.limits) para('limits', p.limits);
    if (arr(p.run).length) {
      L.push(line('ind1', '<span class="tok-cmt">' + (py ? '# ' : '// ') + esc(T('run_comment')) + '</span>'), line('ind1', '<span class="tok-key">run</span>: ['));
      arr(p.run).forEach((c) => L.push(line('ind2', '<span class="tok-str">"' + esc(c) + '"</span>,')));
      L.push(line('ind1', '],'), blank());
    }
    if (arr(p.stack).length) L.push(line('ind1', '<span class="tok-key">stack</span>: [' + arr(p.stack).map((t) => '<span class="tok-str">"' + esc(t) + '"</span>').join(', ') + '],'));
    const lk = Object.keys(p.links || {});
    if (lk.length) L.push(line('ind1', '<span class="tok-key">links</span>: { ' + lk.map((k) => '<span class="tok-key">' + esc(k) + '</span>: <span class="tok-str">"…"</span>').join(', ') + ' }'));
    if (!py) L.push(line('', '}'));
    return wrap('section', sec.id, IDE_CLS,
      head('SOURCE', 'projects/' + sec.file, p.badge ? '<span class="badge" style="color:#4ec9b0;border-color:#2c5f55">' + esc(p.badge) + '</span>' : '') +
      secTitle(p.title) + helpBox(p.help) +
      '<div data-stagger class="code-block text-xs sm:text-[13px]">' + L.join('') + '</div>' +
      docsHTML(p.docs, sec.id) + linkBtnsIDE(p.links, p.extraLink, p.docs) + nextLink(sec));
  }

  function ideAI(sec) {
    const a = C.ai, TS = '<span class="tok-str">';
    const strs = (list) => arr(list).map((t) => '<span class="tok-str">"' + esc(t) + '"</span>').join(', ');
    const L = [
      line('', '<span class="tok-cmt">"""</span>'), line('', '<span class="tok-cmt">' + esc(a.docstring || sec.file) + '</span>'), line('', '<span class="tok-cmt">"""</span>'), blank(),
      line('', '<span class="tok-kw2">class</span> <span class="tok-cls">' + esc(a.className || (FIRST + 'AI')) + '</span>:'),
      line('ind1', '<span class="tok-key">target_roles</span> = [' + strs(P.next) + ']'),
      line('ind1', '<span class="tok-key">principle</span> = ' + TS + '"' + esc(a.principle) + '"</span>' + (a.principleNote ? '  <span class="tok-cmt"># ' + esc(a.principleNote) + '</span>' : '')), blank(),
      line('ind1', '<span class="tok-cmt">' + esc(T('ai_c1')) + '</span>'), line('ind1', '<span class="tok-key">foundation</span> = {'),
    ];
    arr(a.foundation).forEach((f) => L.push(line('ind2', TS + '"' + esc(f.key) + '"</span>: [' + strs(f.items) + '],')));
    L.push(line('ind1', '}'), blank(), line('ind1', '<span class="tok-cmt">' + esc(T('ai_c2')) + '</span>'), line('ind1', '<span class="tok-key">learning</span> = ['));
    arr(a.learning).forEach((t) => L.push(line('ind2', TS + '"' + esc(t) + '"</span>,')));
    L.push(line('ind1', ']'), blank());
    if (a.latest) L.push(line('ind1', '<span class="tok-cmt">' + esc(T('ai_c3')) + '</span>'), line('ind1', '<span class="tok-key">latest</span> = ' + TS + '"' + esc(a.latest) + '"</span>'), blank());
    L.push(line('ind1', '<span class="tok-kw2">def</span> <span class="tok-fn">goal</span>(<span class="tok-key">self</span>):'), line('ind2', '<span class="tok-kw2">return</span> ' + TS + '"' + esc(a.goal) + '"</span>'));

    const lp = a.loop || {}, ar = a.architecture || {};
    const loop = arr(lp.steps).length
      ? '<h3 class="reveal font-ui font-semibold text-white text-base mt-10 mb-1">' + esc(lp.title || '') + '</h3>' +
        '<p class="reveal font-ui text-[13px] text-dim mb-4 max-w-2xl">' + rich(lp.intro || '') + '</p>' +
        '<div data-stagger class="loop">' + lp.steps.map((s) =>
          '<div class="loop-step"><h4>' + ico(s.icon || 'check', 'w-3.5 h-3.5 text-accent') + ' ' + esc(s.title) + '</h4><p>' + esc(s.text) + '</p>' + (s.map ? '<p class="map">' + esc(s.map) + '</p>' : '') + '</div>').join('') + '</div>'
      : '';
    const arch = arr(ar.flow).length
      ? '<h3 class="reveal font-ui font-semibold text-white text-base mt-10 mb-1">' + esc(ar.title || '') +
          (ar.badge ? ' <span class="font-mono text-[10px] text-teal border border-[#2c5f55] rounded px-1.5 py-0.5 ml-1 align-middle">' + esc(ar.badge) + '</span>' : '') + '</h3>' +
        '<p class="reveal font-ui text-[13px] text-dim mb-4 max-w-2xl">' + rich(ar.intro || '') + '</p>' +
        '<div class="reveal flow">' + flowHTML(ar.flow) + '</div>' + legendHTML() +
        (arr(ar.notes).length ? '<div data-stagger class="grid sm:grid-cols-3 gap-3 mt-6 font-ui">' + ar.notes.map((n) =>
          '<div class="border border-line rounded-lg p-3.5 bg-panel/60"><p class="font-mono text-[11px] text-accent mb-1">' + esc(n.title) + '</p><p class="text-[12.5px] text-dim leading-relaxed">' + rich(n.text) + '</p></div>').join('') + '</div>' : '')
      : '';
    return wrap('section', 'ai', IDE_CLS,
      head('SOURCE', sec.file, a.badge ? '<span class="badge" style="color:#4ec9b0;border-color:#2c5f55">' + esc(a.badge) + '</span>' : '') +
      secTitle(a.title) + helpBox(a.help) + '<div data-stagger class="code-block text-xs sm:text-[13px]">' + L.join('') + '</div>' + loop + arch + nextLink(sec));
  }
  function flowHTML(flow) {
    return arr(flow).map((f, i, all) => '<span class="node' + (f.t ? ' ' + esc(f.t) : '') + '">' + esc(f.n) + '</span>' + (i < all.length - 1 ? '<span class="arrow">›</span>' : '')).join('');
  }
  function legendHTML() {
    return '<div class="reveal legend"><span><i style="background:#3fb950"></i>' + esc(T('lg_gate')) + '</span><span><i style="background:#4fa8e0"></i>' + esc(T('lg_llm')) + '</span><span><i style="background:#f0b86a"></i>' + esc(T('lg_loop')) + '</span></div>';
  }

  function ideExperience(sec) {
    const e = C.experience;
    const items = arr(e.items).map((x) =>
      '<div>' + line('', '<span class="tok-num">[' + esc(x.date || '') + ']</span> <span class="tok-fn">INFO</span>  ' + esc(x.title)) +
      line('ind1', '<span class="tok-key">company</span>  ' + esc(x.company) + (x.place ? ' — ' + esc(x.place) : '')) +
      line('ind1', '<span class="tok-key">type</span>     ' + esc(x.type || '') + (x.period ? ' &middot; ' + esc(x.period) : '')) +
      line('ind1', '<span class="tok-key">tasks</span>') +
      arr(x.tasks).map((t) => line('ind2 text-ink/90', '&gt; ' + rich(t))).join('') + '</div>').join('');
    return wrap('section', 'experience', IDE_CLS,
      head('SOURCE', sec.file) + secTitle(e.title || 'Pengalaman Kerja') + helpBox(e.help) +
      '<div data-stagger class="code-block text-xs sm:text-[13px] space-y-6">' + items + '</div>' + nextLink(sec));
  }

  function eduLogo(x) {
    return x.logo ? '<div class="edu-logo' + (x.bleed ? ' bleed' : '') + '"><img src="' + esc(x.logo) + '" alt="Logo ' + esc(x.school) + '" loading="lazy" width="96" height="96" decoding="async"></div>' : '';
  }
  const eduLoc = (x) => (x.place ? '<p class="edu-loc">' + ico('map-pin', 'w-3 h-3 shrink-0') + ' ' + esc(x.place) + '</p>' : '');
  function ideEducation(sec) {
    const e = C.education;
    const cards = arr(e.items).map((x) => {
      if (x.degree) {
        return '<div class="edu-card"><div class="flex items-start gap-4">' + eduLogo(x) + '<div class="min-w-0"><h2 class="md-h2">## ' + esc(x.degree) + '</h2>' +
          '<p class="md-p mt-1"><b>' + esc(x.school) + '</b> &middot; ' + esc(x.period || '') + (x.gpa ? ' &middot; ' + esc(T('gpa')) + ' <span class="tok-num">' + esc(x.gpa) + '</span>' : '') + '</p>' + eduLoc(x) + '</div></div>' +
          (x.thesis ? '<div class="mt-5 pt-5 border-t border-line/60"><p class="text-[11px] font-mono text-dim mb-2">### ' + esc(x.thesisTitle || 'Tugas Akhir') + '</p><p class="md-p">' + rich(x.thesis) + '</p></div>' : '') + '</div>';
      }
      return '<div class="edu-card flex items-start gap-4">' + eduLogo(x) + '<div class="min-w-0"><h3>' + esc(x.school) + '</h3><p class="edu-meta">' + esc(x.level || '') + (x.level && x.period ? ' &middot; ' : '') + esc(x.period || '') + '</p>' + eduLoc(x) + '</div></div>';
    }).join('');
    return wrap('section', 'education', IDE_CLS,
      head('PREVIEW', sec.file) + secTitle(e.title || 'Pendidikan') + helpBox(e.help) + '<div data-stagger class="edu-tl space-y-4">' + cards + '</div>' + nextLink(sec));
  }

  function certsHTML() {
    const folder = (C.certificates && C.certificates.folder) || 'assets/sertifikat/';
    const issuer = (C.certificates && C.certificates.defaultIssuer) || '';
    return CERTS.map((g) =>
      '<div><p class="cert-g">// ' + esc(g.group) + '</p><div class="cert-grid">' +
      arr(g.items).map((c) =>
        '<a class="cert-card" href="' + esc(folder + c.f) + '" target="_blank" rel="noopener" title="' + esc(T('cert_open')) + '">' +
        '<span class="cert-ico">' + ico('award', 'w-4 h-4') + '</span>' +
        '<span class="min-w-0"><span class="cert-t">' + esc(c.t) + '</span>' + (c.en ? '<span class="cert-en">' + esc(c.en) + '</span>' : '') +
        '<span class="cert-meta">' + esc(c.by || issuer) + (c.d ? ' · ' + esc(c.d) : '') + '</span></span>' + ico('external-link', 'cert-go w-3.5 h-3.5') + '</a>'
      ).join('') + '</div></div>'
    ).join('');
  }
  function ideCertificates(sec) {
    const c = C.certificates;
    return wrap('section', 'certificates', IDE_CLS, head('SOURCE', sec.file) + secTitle(c.title || 'Sertifikasi') + helpBox(c.help) + '<div id="certs-ide" class="space-y-7">' + certsHTML() + '</div>' + nextLink(sec));
  }

  function ideExtra(sec) {
    const x = sec.x;
    const items = arr(x.items).map((it) =>
      '<div class="edu-card"><h3>' + esc(it.title) + '</h3>' + (it.meta ? '<p class="edu-meta">' + esc(it.meta) + '</p>' : '') +
      (it.text ? '<p class="md-p mt-2">' + rich(it.text) + '</p>' : '') +
      (it.link ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 mt-2 text-xs text-accent hover:text-white">' + ico('external-link', 'w-3.5 h-3.5') + ' Lihat</a>' : '') + '</div>').join('');
    return wrap('section', sec.id, IDE_CLS, head('PREVIEW', sec.file) + secTitle(x.title) + helpBox(x.help) + '<div data-stagger class="edu-tl space-y-4">' + items + '</div>' + nextLink(sec));
  }

  function ideContact(sec) {
    const c = CT;
    const lnk = (label, href, text) => '<a href="' + esc(href) + '" target="_blank" rel="noopener" class="tok-str underline decoration-dotted hover:text-accent">"' + esc(text) + '"</a>';
    const rows = [];
    if (c.whatsapp) rows.push('<span class="tok-key">"whatsapp"</span>: ' + lnk('wa', waHref(), c.whatsappDisplay || T('btn_wa')));
    if (isReal(c.email)) rows.push('<span class="tok-key">"email"</span>: <a href="' + esc(mailHref()) + '" class="tok-str underline decoration-dotted hover:text-accent">"' + esc(c.email) + '"</a>');
    if (c.address) rows.push('<span class="tok-key">"location"</span>: <span class="tok-str">"' + esc(c.address) + '"</span>');
    if (isReal(c.github)) rows.push('<span class="tok-key">"github"</span>: ' + lnk('gh', c.github, c.github.replace(/^https?:\/\//, '')));
    if (isReal(c.linkedin)) rows.push('<span class="tok-key">"linkedin"</span>: ' + lnk('li', c.linkedin, c.linkedin.replace(/^https?:\/\//, '')));
    rows.push('<span class="tok-key">"status"</span>: <span class="tok-str">"' + (P.openToWork === false ? 'not_available' : 'available_for_hire') + '"</span>');
    const code = line('', '{') + rows.map((r, i) => line('ind1', r + (i < rows.length - 1 ? ',' : ''))).join('') + line('', '}');
    const btn = 'px-3.5 py-2 text-xs font-medium rounded-md ';
    const buttons = [
      c.whatsapp ? '<a href="' + esc(waHref()) + '" target="_blank" rel="noopener" class="' + btn + 'bg-accentfill hover:bg-accent text-white flex items-center gap-2">' + ico('message-circle', 'w-4 h-4') + ' ' + T('btn_wa') + '</a>' : '',
      isReal(c.email) ? '<a href="' + esc(mailHref()) + '" class="' + btn + 'border border-line hover:border-accent hover:text-white flex items-center gap-2">' + ico('mail', 'w-4 h-4') + ' ' + T('btn_email') + '</a>' : '',
      c.cv ? '<a href="' + esc(c.cv) + '" download class="' + btn + 'border border-line hover:border-accent hover:text-white flex items-center gap-2">' + ico('download', 'w-4 h-4') + ' ' + T('btn_cv') + '</a>' : '',
      isReal(c.github) ? '<a href="' + esc(c.github) + '" target="_blank" rel="noopener" aria-label="GitHub" class="w-9 h-9 flex items-center justify-center border border-line rounded-md hover:border-accent text-dim hover:text-white">' + ghIcon('w-4 h-4') + '</a>' : '',
      isReal(c.linkedin) ? '<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener" aria-label="LinkedIn" class="w-9 h-9 flex items-center justify-center border border-line rounded-md hover:border-accent text-dim hover:text-white">' + liIcon('w-4 h-4') + '</a>' : '',
    ].join('');
    return wrap('footer', 'contact', 'px-5 sm:px-8 py-10 max-w-4xl',
      head('SOURCE', sec.file) + secTitle(c.title || 'Kontak') + helpBox(c.help) +
      '<div data-stagger class="code-block text-xs sm:text-[13px]">' + code + '</div>' +
      '<div class="reveal flex flex-wrap gap-3 mt-8 font-ui">' + buttons + '</div>' + nextLink(sec) +
      '<p class="text-[11px] font-mono text-dim mt-12 pt-6 border-t border-line/60"><span class="tok-cmt">// ' + esc((C.site && C.site.footer) || '') + ' — ' + esc(T('footer_built')) + '</span></p>');
  }

  /* ================================================================
     8. RENDERER — TAMPILAN RINGKAS
     ================================================================ */
  const R_SEC = 'py-12 border-b border-line/60';
  const metricsReader = (list) => {
    const m = arr(list);
    if (!m.length) return '';
    return '<div class="stat-grid mb-2"' + (m.length !== 3 ? ' style="grid-template-columns:repeat(' + Math.min(m.length, 4) + ',minmax(0,1fr))"' : '') + '>' +
      m.map((x) => { const tip = tipFor(x.label || x.key, x.tip); return '<div><p class="n">' + countSpan(x, '') + '</p><p class="l' + (tip ? ' tip' : '') + '"' + tipAttr(tip) + '>' + esc(x.label || x.key) + '</p></div>'; }).join('') + '</div>';
  };

  function rHero() {
    const firstProj = MODEL.find((s) => s.type === 'project');
    return wrap('section', 'r-hero', 'py-12 sm:py-16 border-b border-line/60',
      '<div class="grid sm:grid-cols-12 gap-8 items-center"><div class="sm:col-span-4"><div class="relative w-full max-w-[260px] mx-auto sm:mx-0 aspect-square rounded-xl overflow-hidden bg-panel border border-line">' + photoImg() + '</div></div>' +
      '<div class="sm:col-span-8">' +
        (P.openToWork === false ? '' : '<p class="font-mono text-xs text-ok mb-3 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-ok"></span> ' + esc(T('open_to_work')) + '</p>') +
        '<h1 class="font-mono font-extrabold text-3xl sm:text-[2.5rem] text-white leading-[1.1] tracking-tight">' + esc(P.name) + '</h1>' +
        '<p class="mt-3 text-lg text-accent font-medium">' + esc(P.headline) + '</p>' +
        (arr(P.next).length ? '<p class="mt-1 text-sm text-dim">' + esc(T('transition')) + ' ' + esc(arr(P.next).join(' & ')) + '</p>' : '') +
        '<p class="r-p mt-5 max-w-xl">' + rich(P.bio) + '</p>' +
        '<div class="mt-5 flex flex-wrap gap-2">' + [P.educationShort].concat(arr(P.focus).slice(0, 2)).filter(Boolean).map((t) => '<span class="r-chip" style="color:#9cdcfe">' + esc(t) + '</span>').join('') + '</div>' +
        '<div class="mt-7 flex flex-wrap gap-3">' +
          '<a href="' + (firstProj ? '#r-' + firstProj.id : '#r-about') + '" class="px-5 py-2.5 rounded-md bg-accentfill hover:bg-accent text-white text-sm font-semibold">' + esc(T('view_projects')) + '</a>' +
          (CT.cv ? '<a href="' + esc(CT.cv) + '" download class="px-5 py-2.5 rounded-md border border-line hover:border-accent text-ink text-sm font-medium flex items-center gap-2">' + ico('download', 'w-4 h-4') + ' ' + esc(T('btn_cv')) + '</a>' : '') +
          '<a href="#r-contact" class="px-5 py-2.5 rounded-md text-dim hover:text-white text-sm font-medium">' + esc(T('contact_me')) + '</a>' +
        '</div></div></div>');
  }
  function rAbout() {
    const a = C.about || {};
    const stats = arr(a.stats).map((s) => '<div class="r-card text-center"><p class="font-mono text-2xl font-bold text-num">' + (typeof s.value === 'number' ? countSpan(s, '') : esc(s.display)) + '</p><p class="text-xs text-dim mt-1">' + esc(s.label || s.key) + '</p></div>').join('');
    const strengths = arr(a.strengths).map((s) => '<div class="r-card"><p class="font-semibold text-white text-[.95rem] mb-1">' + esc(s.title) + '</p><p class="text-sm text-dim leading-relaxed">' + rich(s.text) + '</p></div>').join('');
    return wrap('section', 'r-about', R_SEC,
      '<h2 class="r-h2">' + esc(a.title || 'Tentang Saya') + '</h2><div class="grid md:grid-cols-5 gap-8"><div class="md:col-span-3 space-y-4">' +
      arr(a.paragraphs).map((t) => '<p class="r-p reveal">' + rich(t) + '</p>').join('') + '</div>' +
      '<div data-stagger class="md:col-span-2 grid grid-cols-2 gap-3 content-start">' + stats + '</div></div>' +
      (strengths ? '<div data-stagger class="grid sm:grid-cols-2 gap-3 mt-8">' + strengths + '</div>' : ''));
  }
  function rSkills() {
    const s = C.skills || {};
    const cards = SKILLS.map((g, i) =>
      '<div class="r-card' + (i === SKILLS.length - 1 && SKILLS.length % 2 ? ' sm:col-span-2' : '') + '"><p class="font-semibold text-white text-[.95rem]">' + esc(g.title) + '</p>' +
      '<p class="text-xs text-dim mt-1 mb-3 leading-relaxed">' + esc(g.desc || '') + '</p><div class="flex flex-wrap gap-1.5">' + arr(g.items).map(chipReader).join('') + '</div></div>').join('');
    return wrap('section', 'r-skills', R_SEC, '<h2 class="r-h2">' + esc(s.title || 'Keahlian') + '</h2><p class="r-p mb-6 max-w-2xl text-[.95rem]">' + rich(s.intro || '') + '</p><div id="r-skills-grid" data-stagger class="grid sm:grid-cols-2 gap-4">' + cards + '</div>');
  }
  function rProject(sec) {
    const p = sec.p;
    const cell = (label, body, span) => '<div' + (span ? ' class="sm:col-span-2"' : '') + '><p class="r-label">' + label + '</p>' + body + '</div>';
    const txt = (t) => '<p class="text-sm text-dim leading-relaxed">' + rich(t) + '</p>';
    return wrap('section', 'r-' + sec.id, R_SEC,
      '<h2 class="r-h2">' + esc(p.title) + '</h2><div class="r-card reveal">' +
      '<span class="r-chip" style="color:#4fa8e0">' + esc(p.category || '') + (p.badge ? ' · ' + esc(p.badge) : '') + '</span>' +
      '<p class="r-p mt-3">' + rich(p.intro || '') + '</p>' +
      '<div class="grid sm:grid-cols-2 gap-5 mt-6">' +
        cell(T('r_problem'), txt(p.problem)) + cell(T('r_method'), txt(p.method)) +
        cell(T('r_result'), metricsReader(p.metrics) + txt(p.result)) + cell(T('r_impact'), txt(p.impact)) +
        (p.limits ? cell(T('r_limits'), txt(p.limits), true) : '') +
      '</div>' +
      (arr(p.stack).length ? '<div class="flex flex-wrap gap-1.5 mt-6">' + arr(p.stack).map((t) => '<span class="r-chip">' + esc(t) + '</span>').join('') + '</div>' : '') +
      (arr(p.run).length ? '<details class="mt-5"><summary class="cursor-pointer text-sm text-accent font-medium select-none">' + esc(T('r_run')) + '</summary><pre class="mt-3 p-3 rounded-md bg-editor border border-line text-xs text-str overflow-x-auto" style="font-family:\'JetBrains Mono\',monospace">' + arr(p.run).map(esc).join('\n') + '</pre></details>' : '') +
      docsHTML(p.docs, sec.id) + linkBtnsReader(p.links, p.extraLink, p.docs) + '</div>');
  }
  function rAI() {
    const a = C.ai, ar = a.architecture || {}, lp = a.loop || {};
    const found = arr(a.foundation).map((f) => '<li>' + esc(f.label || f.key) + (arr(f.items).length ? ' (' + arr(f.items).map(esc).join(', ') + ')' : '') + '</li>').join('');
    const learn = arr(a.learning).map((t) => '<li>' + esc(t) + '</li>').join('');
    const lc = a.latestCard || {};
    return wrap('section', 'r-ai', R_SEC,
      '<h2 class="r-h2">' + esc(a.title) + '</h2><p class="r-p max-w-2xl">' + rich(a.intro || '') + '</p>' +
      '<div data-stagger class="grid md:grid-cols-3 gap-4 mt-6">' +
        '<div class="r-card"><p class="r-label" style="color:#3fb950">' + esc(T('ai_found')) + '</p><ul class="mt-2 space-y-1.5 text-sm text-dim leading-relaxed list-disc list-inside">' + found + '</ul></div>' +
        '<div class="r-card"><p class="r-label" style="color:#dcdcaa">' + esc(T('ai_learn')) + '</p><ul class="mt-2 space-y-1.5 text-sm text-dim leading-relaxed list-disc list-inside">' + learn + '</ul></div>' +
        (lc.title ? '<div class="r-card"><p class="r-label" style="color:#4ec9b0">' + esc(lc.label || '') + '</p><p class="mt-2 text-sm text-ink font-medium">' + esc(lc.title) + '</p><p class="mt-1 text-sm text-dim leading-relaxed">' + rich(lc.text || '') + '</p></div>' : '') +
      '</div>' +
      (arr(lp.steps).length ? '<h3 class="font-semibold text-white mt-9 mb-3 text-base">' + esc(T('ai_cycle')) + '</h3><div data-stagger class="loop">' + lp.steps.map((s) => '<div class="loop-step"><h4>' + ico(s.icon || 'check', 'w-3.5 h-3.5 text-accent') + ' ' + esc(s.title) + '</h4><p>' + esc(s.text) + '</p></div>').join('') + '</div>' : '') +
      (arr(ar.flow).length ? '<details class="mt-6 r-card"><summary class="cursor-pointer text-sm text-accent font-medium select-none">' + esc(ar.summaryTitle || T('arch_default')) + '</summary><div class="flow mt-4">' + flowHTML(ar.flow) + '</div>' + legendHTML().replace(' reveal', '') + '</details>' : ''));
  }
  function rExperience() {
    const e = C.experience, dots = ['bg-accentfill ring-accentfill/20', 'bg-ok ring-ok/20'];
    const items = arr(e.items).map((x, i) =>
      '<div class="relative"><span class="absolute -left-[33px] top-1.5 w-3 h-3 rounded-full ring-4 ' + dots[i % 2] + '"></span>' +
      '<p class="font-mono text-xs text-accent">' + esc(x.period || '') + (x.type ? ' · ' + esc(x.type) : '') + '</p>' +
      '<h3 class="font-semibold text-white text-lg mt-1">' + esc(x.title) + '</h3><p class="text-sm text-dim">' + esc(x.company) + (x.place ? ' — ' + esc(x.place) : '') + '</p>' +
      '<ul class="mt-3 space-y-1.5 text-sm text-dim leading-relaxed list-disc list-inside">' + arr(x.tasks).map((t) => '<li>' + rich(t) + '</li>').join('') + '</ul></div>').join('');
    return wrap('section', 'r-experience', R_SEC, '<h2 class="r-h2">' + esc(e.title || 'Pengalaman Kerja') + '</h2><div data-stagger class="relative pl-7 border-l border-line space-y-9 ml-1">' + items + '</div>');
  }
  function rEducation() {
    const e = C.education;
    const cards = arr(e.items).map((x) => {
      if (x.degree) {
        return '<div class="edu-card"><div class="flex flex-wrap items-start justify-between gap-3"><div class="flex items-start gap-4">' + eduLogo(x) + '<div><h3>' + esc(x.degree) + '</h3>' +
          '<p class="edu-meta">' + esc(x.school) + ' · ' + esc(x.period || '') + '</p>' + eduLoc(x) + '</div></div>' +
          (x.gpa ? '<span class="font-mono text-sm text-num border border-line rounded-full px-4 py-1">' + esc(T('gpa')) + ' ' + esc(x.gpa) + '</span>' : '') + '</div>' +
          (x.thesis ? '<div class="mt-4 pt-4 border-t border-line"><p class="r-label">' + esc(x.thesisTitle || 'Tugas Akhir') + '</p><p class="text-sm text-dim leading-relaxed">' + rich(x.thesis) + '</p></div>' : '') + '</div>';
      }
      return '<div class="edu-card flex items-start gap-4">' + eduLogo(x) + '<div><h3>' + esc(x.school) + '</h3><p class="edu-meta">' + esc(x.level || '') + (x.level && x.period ? ' · ' : '') + esc(x.period || '') + '</p>' + eduLoc(x) + '</div></div>';
    }).join('');
    return wrap('section', 'r-education', R_SEC, '<h2 class="r-h2">' + esc(e.title || 'Pendidikan') + '</h2><div data-stagger class="edu-tl space-y-4">' + cards + '</div>');
  }
  function rCertificates() {
    const c = C.certificates;
    return wrap('section', 'r-certificates', R_SEC, '<h2 class="r-h2">' + esc(c.title || 'Sertifikasi') + '</h2><p class="r-p mb-6 max-w-2xl">' + rich(c.intro || '') + '</p><div id="r-certs-grid" class="space-y-7">' + certsHTML() + '</div>');
  }
  function rExtra(sec) {
    const x = sec.x;
    const items = arr(x.items).map((it) => '<div class="edu-card"><h3>' + esc(it.title) + '</h3>' + (it.meta ? '<p class="edu-meta">' + esc(it.meta) + '</p>' : '') +
      (it.text ? '<p class="text-sm text-dim leading-relaxed mt-2">' + rich(it.text) + '</p>' : '') +
      (it.link ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 mt-2 text-sm text-accent hover:text-white">' + ico('external-link', 'w-3.5 h-3.5') + ' Lihat</a>' : '') + '</div>').join('');
    return wrap('section', 'r-' + sec.id, R_SEC, '<h2 class="r-h2">' + esc(x.title) + '</h2>' + (x.help ? '<p class="r-p mb-5 max-w-2xl">' + rich(x.help) + '</p>' : '') + '<div data-stagger class="edu-tl space-y-4">' + items + '</div>');
  }
  function rContact() {
    const c = CT;
    const card = (href, icon, label, text) => '<a href="' + esc(href) + '" target="_blank" rel="noopener" class="r-card flex items-center gap-3 hover:border-accent">' + ico(icon, 'w-5 h-5 text-accent') + '<div><p class="text-xs text-dim">' + label + '</p><p class="text-sm text-white">' + esc(text) + '</p></div></a>';
    const cards = [
      c.whatsapp ? card(waHref(), 'message-circle', T('lbl_wa'), c.whatsappDisplay || T('btn_wa')) : '',
      isReal(c.email) ? card(mailHref(), 'mail', T('lbl_email'), c.email) : '',
      c.address ? '<div class="r-card flex items-center gap-3 sm:col-span-2">' + ico('map-pin', 'w-5 h-5 text-accent') + '<div><p class="text-xs text-dim">' + esc(T('lbl_loc')) + '</p><p class="text-sm text-white">' + esc(c.address) + '</p></div></div>' : '',
    ].join('');
    const small = 'w-10 h-10 flex items-center justify-center border border-line rounded-md hover:border-accent text-dim hover:text-white';
    return wrap('section', 'r-contact', 'py-12',
      '<h2 class="r-h2">' + esc(c.title || 'Kontak') + '</h2><p class="r-p mb-6 max-w-xl">' + rich(c.intro || '') + '</p>' +
      '<div data-stagger class="grid sm:grid-cols-2 gap-3 max-w-2xl">' + cards + '</div>' +
      '<div class="flex flex-wrap gap-3 mt-6">' +
        (isReal(c.github) ? '<a href="' + esc(c.github) + '" target="_blank" rel="noopener" aria-label="GitHub" class="' + small + '">' + ghIcon('w-[18px] h-[18px]') + '</a>' : '') +
        (isReal(c.linkedin) ? '<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener" aria-label="LinkedIn" class="' + small + '">' + liIcon('w-[18px] h-[18px]') + '</a>' : '') +
        (c.cv ? '<a href="' + esc(c.cv) + '" download class="px-4 h-10 flex items-center gap-2 border border-line rounded-md hover:border-accent text-sm text-ink">' + ico('download', 'w-4 h-4') + ' ' + esc(T('btn_cv')) + '</a>' : '') +
      '</div><div class="mt-12 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs text-dim"><span>' + esc((C.site && C.site.footer) || '') + '</span>' +
      '<button data-action="mode-code" class="flex items-center gap-1.5 hover:text-white">' + ico('file-code', 'w-3.5 h-3.5') + ' ' + esc(T('see_code_view')) + '</button></div>');
  }

  /* ================================================================
     9. RAKIT HALAMAN (dengan penjaga: satu bagian rusak tidak merusak semuanya)
     ================================================================ */
  const IDE_R = { hero: ideHero, about: ideAbout, skills: ideSkills, project: ideProject, ai: ideAI, experience: ideExperience, education: ideEducation, certificates: ideCertificates, extra: ideExtra, contact: ideContact };
  const RDR_R = { hero: rHero, about: rAbout, skills: rSkills, project: rProject, ai: rAI, experience: rExperience, education: rEducation, certificates: rCertificates, extra: rExtra, contact: rContact };
  function safe(fn, sec) {
    try { return fn(sec); } catch (err) {
      if (window.console) console.error('Bagian "' + sec.id + '" gagal dibuat:', err);
      return '<section id="' + esc(sec.id) + '" class="px-5 sm:px-8 py-8 max-w-4xl"><div style="border:1px solid #c0392b;background:#2a1513;border-radius:8px;padding:1rem;color:#fff;font:13px/1.6 sans-serif">' +
        '<b>⚠ Bagian “' + esc(sec.id) + '” bermasalah:</b> ' + esc(err && err.message) + '<br>Periksa isinya di <code>content.js</code> (biasanya ada tanda kutip atau koma yang kurang).</div></section>';
    }
  }
  function renderPage() {
    const ide = MODEL.map((s) => safe(IDE_R[s.type], s)).join('');
    const rdr = MODEL.map((s) => {
      const html = safe(RDR_R[s.type], s);
      return s.type === 'hero' || s.id.indexOf('r-') === 0 ? html : html;
    }).join('');
    $('#ide-sections').innerHTML = ide;
    $('#reader-sections').innerHTML = rdr;
  }

  function treeHTML() {
    return FILES.map((f) => {
      if (f.folder) return '<div class="file-folder" data-folder><i data-lucide="folder-open" class="w-3.5 h-3.5 text-accent shrink-0"></i><span><span>' + esc(f.folder) + '</span><span class="sub">' + esc(f.sub) + '</span></span></div>';
      const search = (f.name + ' ' + f.sub + ' ' + (f.kw || '')).toLowerCase();
      return '<a href="#' + f.id + '" class="file-link file-item' + (f.child ? ' child' : '') + '" data-target="' + f.id + '" data-search="' + esc(search) + '">' +
        '<i data-lucide="' + f.icon + '" class="w-3.5 h-3.5 shrink-0 ' + f.color + '"></i><span><span>' + esc(f.name) + '</span><span class="sub">' + esc(f.sub) + '</span></span></a>';
    }).join('');
  }
  function tabsHTML() {
    return FILES.filter((f) => f.id).map((f) => '<a href="#' + f.id + '" class="tab" data-target="' + f.id + '" role="tab" title="' + esc(f.sub) + '"><i data-lucide="' + f.icon + '" class="w-3.5 h-3.5 ' + f.color + '"></i>' + esc(f.name.split('/').pop()) + '</a>').join('');
  }
  /* teks statis di index.html memakai token {agent} {first} {name} {brand}; diganti dari content.js */
  function fillTokens() {
    const brand = String((C.site && C.site.titleBar) || '').split(' — ')[0] || 'portfolio';
    const map = { agent: AGENT_NAME, first: FIRST, name: P.name || '', brand: brand };
    const sub = (t) => t.replace(/\{(agent|first|name|brand)\}/g, (_, k) => map[k]);
    $$('[title],[aria-label],[placeholder]').forEach((el) => ['title', 'aria-label', 'placeholder'].forEach((at) => {
      const v = el.getAttribute(at);
      if (v && v.indexOf('{') !== -1) el.setAttribute(at, sub(v));
    }));
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach((n) => { if (n.nodeValue.indexOf('{') !== -1 && !/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) n.nodeValue = sub(n.nodeValue); });
  }

  function renderAll() {
    fillTokens();
    buildModel();
    renderPage();
    $('#file-list').innerHTML = treeHTML() + '<p id="file-empty" class="px-3 py-2 text-[11px] text-dim" style="display:none">' + esc(T('no_match')) + '</p>';
    $('#drawer-list').innerHTML = treeHTML();
    $('#tabs').innerHTML = tabsHTML();
    $('#r-pills').innerHTML = READER_NAV.map((n) => '<a href="#r-' + n.id + '" class="r-pill" data-id="' + n.id + '">' + esc(n.label) + '</a>').join('');
    $('#agent-chips').innerHTML = SUGGEST.map((s) => '<button type="button" class="chip" data-q="' + esc(s) + '">' + esc(s) + '</button>').join('');
    // teks statis yang bergantung data diri
    $$('[data-bind="name"]').forEach((el) => { el.textContent = P.name || ''; });
    $$('[data-bind="agent"]').forEach((el) => { el.textContent = AGENT_NAME; });
    if ((P.name || '') && document.title.indexOf('{name}') !== -1) document.title = document.title.replace('{name}', P.name);
  }


  /* ================================================================
     10. DAFFA-AGENT — intent (kata kunci + jawaban) DIBANGUN dari content.js,
         jadi jawabannya selalu ikut berubah saat isi portofolio diubah.
     ================================================================ */
  const cfgFill = (tpl) => String(tpl).replace(/\{([\w.]+)\}/g, (_, k) => { const v = CONFIG[k]; return v == null ? '' : v; });
  const nProj = () => MODEL.filter((s) => s.type === 'project').length;
  const nCert = () => CERTS.reduce((n, g) => n + arr(g.items).length, 0);
  const cleanTitle = (t) => String(t || '').replace(/^(Proyek|Project)\s*\d+\s*[—–-]\s*/i, '');
  const metricText = (p) => arr(p.metrics).map((m) => m.label + ' ' + (LANG === 'id' ? String(m.value).replace('.', ',') : String(m.value)) + (m.suffix || '')).join(', ');
  let INTENTS = [];

  function buildIntents() {
    const proj = MODEL.filter((s) => s.type === 'project');
    const has = (id) => MODEL.some((s) => s.id === id);
    const out = [];
    const add = (it) => { if (!it.sec || has(it.sec)) out.push(it); };
    const issuer = (C.certificates && C.certificates.defaultIssuer) || T('i_issuer_fallback');

    add({ key: 'greet', sec: 'hero', src: ['hero.tsx'],
      kw: [' halo ', ' hai ', ' hi ', ' hello ', ' hey ', 'selamat pagi', 'selamat siang', 'selamat malam', 'assalamualaikum', 'good morning', 'good afternoon', 'good evening'],
      answer: GREETING, links: [{ label: T('i_home'), goto: 'hero' }] });

    add({ key: 'who', sec: 'about', src: ['about.md'],
      kw: ['siapa', 'perkenalan', 'kenalkan', 'tentang ' + FIRST.toLowerCase(), 'profil', 'ceritakan tentang', 'who is', 'introduce', 'about ' + FIRST.toLowerCase(), 'profile', 'tell me about'],
      answer: '**' + P.name + '** — ' + (P.summary || P.headline || ''),
      links: [{ label: T('i_about_btn'), goto: 'about' }] });

    add({ key: 'skills', sec: 'skills', src: ['skills.json'],
      kw: ['keahlian', 'skill', 'kemampuan', 'tools', 'teknologi', 'bisa apa', 'menguasai', 'bahasa pemrograman', 'skills', 'abilities', 'technologies', 'tech stack', 'programming languages', 'good at'],
      answer: () => T('i_skills') + '\n' + SKILLS.map((g) => '• **' + g.title + '**: ' + arr(g.items).join(', ')).join('\n'),
      links: [{ label: T('i_skills_btn'), goto: 'skills' }] });

    if (proj.length) {
      add({ key: 'projects', sec: proj[0].id, src: proj.map((s) => s.file),
        kw: ['proyek', 'project', 'projects', 'portofolio', 'portfolio', 'karya', 'terbaik', 'best project', 'featured'],
        answer: () => T('i_projects', { n: proj.length }) + '\n' + proj.map((s, i) => (i + 1) + ') **' + cleanTitle(s.p.title) + '** — ' + plain(s.p.intro || '')).join('\n'),
        links: proj.map((s, i) => ({ label: T('project') + ' ' + (i + 1), goto: s.id })) });
    }
    proj.forEach((s) => {
      const p = s.p;
      const words = String(p.keywords || '').split(/\s+/).filter((w) => w.length > 2);
      const titleWords = cleanTitle(p.title).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      add({ key: 'project:' + s.id, sec: s.id, src: [s.file],
        kw: Array.from(new Set(words.concat(titleWords))),
        answer: () => '**' + cleanTitle(p.title) + '**: ' + plain(p.intro || '') +
          (arr(p.metrics).length ? ' ' + T('i_results') + ' ' + metricText(p) + '.' : '') + ' ' + plain(p.result || '') + ' ' + plain(p.impact || ''),
        links: [{ label: T('i_open_project', { n: s.n }), goto: s.id }].concat(p.extraLink && p.extraLink.goto ? [{ label: p.extraLink.label || T('btn_more'), goto: p.extraLink.goto }] : []) });
      if (p.docs) {
        const d = p.docs;
        add({ key: 'docs:' + s.id, sec: s.id, src: [s.file], boost: 1.05,
          kw: Array.from(new Set(['dokumentasi', 'documentation', 'docs', 'document', 'pdf', 'screenshot', 'tampilan', 'arsitektur', 'architecture'].concat(words, titleWords))),
          answer: () => '**' + d.title + '**: ' + plain(d.scope || '') + ' ' + plain(d.summary || ''),
          links: [{ label: T('i_docs_btn', { n: s.n }), goto: s.id }].concat(d.pdf ? [{ label: T('i_docs_pdf'), href: d.pdf }] : []) });
      }
    });

    if (C.experience) add({ key: 'experience', sec: 'experience', src: [C.experience.file || 'experience.log'],
      kw: ['pengalaman', 'pekerjaan', 'riwayat kerja', 'pernah kerja', 'kerjanya', 'experience', 'work history', 'worked', 'job', 'jobs', 'employment'].concat(
        arr(C.experience.items).reduce((a, x) => a.concat(String(x.company || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)), [])),
      answer: () => arr(C.experience.items).map((x) => '• **' + x.company + '** (' + x.period + (x.type ? ', ' + x.type : '') + ') — ' + x.title + ': ' + arr(x.tasks).slice(0, 3).map(plain).join(' ')).join('\n'),
      links: [{ label: T('i_open', { file: C.experience.file || 'experience.log' }), goto: 'experience' }] });

    if (C.education) add({ key: 'education', sec: 'education', src: [C.education.file || 'education.md'],
      kw: ['pendidikan', 'kuliah', 'gunadarma', ' ipk ', 'skripsi', 'lulusan', 'kampus', 'universitas', 'education', 'sekolah', ' sma ', ' smp ', 'riwayat pendidikan', 'university', 'school', ' gpa ', 'thesis', 'degree', 'graduate', 'studied'],
      answer: () => {
        const items = arr(C.education.items), main = items.find((x) => x.degree), rest = items.filter((x) => x !== main);
        return (main ? main.degree + ', **' + main.school + '**, ' + main.period + (main.gpa ? ', ' + T('i_gpa') + ' ' + main.gpa : '') + '.' + (main.thesis ? ' ' + T('i_thesis') + ' ' + plain(main.thesis) : '') : '') +
          (rest.length ? '\n' + T('i_prior') + ' ' + rest.map((x) => x.school + ' (' + x.period + ')').join(', ') + '.' : '');
      },
      links: [{ label: T('i_open', { file: C.education.file || 'education.md' }), goto: 'education' }] });

    if (C.certificates) add({ key: 'certs', sec: 'certificates', src: [C.certificates.file || 'certificates.json'],
      kw: ['sertifikat', 'sertifikasi', 'pelatihan', 'training', 'oracle', 'golang', ' go ', 'aptitude', 'gdsc', 'bersertifikat', 'certificate', 'certificates', 'certification', 'certified', 'courses'],
      answer: () => T('i_certs', { n: nCert(), issuer: issuer }) + '\n' +
        CERTS.map((g) => '• **' + g.group + '**: ' + arr(g.items).map((c) => c.t + ' (' + c.d + ')').join('; ')).join('\n'),
      links: [{ label: T('i_open', { file: C.certificates.file || 'certificates.json' }), goto: 'certificates' }] });

    if (C.ai) add({ key: 'ai_career', sec: 'ai', src: [C.ai.file || 'ai_agent.py'],
      kw: ['ai engineer', 'ai agent', ' agent ', ' llm ', ' rag ', 'karier', 'karir', 'cita-cita', 'jadi ai', 'menuju', 'kenapa ai', 'arah', 'career', 'why ai', 'become', 'goal', 'direction'],
      answer: C.ai.summary || '', links: [{ label: T('i_open', { file: C.ai.file || 'ai_agent.py' }), goto: 'ai' }] });

    add({ key: 'contact', sec: 'contact', src: ['contact.json'],
      kw: ['hubungi', 'kontak', 'email', 'whatsapp', ' wa ', 'telepon', 'nomor', 'alamat', 'lokasi', 'domisili', 'contact', 'reach', 'phone', 'address', 'location', 'github', 'linkedin'],
      answer: () => T('i_contact') + '\n' +
        (CT.whatsapp ? '• ' + T('i_wa') + ': ' + (CT.whatsappDisplay || T('btn_wa')) + '\n' : '') + (isReal(CT.email) ? '• Email: ' + CT.email + '\n' : '') +
        (isReal(CT.github) ? '• GitHub: ' + CT.github + '\n' : '') + (isReal(CT.linkedin) ? '• LinkedIn: ' + CT.linkedin + '\n' : '') +
        (CT.address ? '• ' + T('i_loc') + ': ' + CT.address : ''),
      links: () => [].concat(CT.whatsapp ? [{ label: T('i_chat_wa'), href: cfgFill('https://wa.me/{whatsapp}') }] : [],
        isReal(CT.email) ? [{ label: T('i_mail'), href: cfgFill('mailto:{email}') }] : [], [{ label: T('i_open', { file: 'contact.json' }), goto: 'contact' }]) });

    if (CT.cv) add({ key: 'cv', sec: 'contact', src: [CT.cv], kw: [' cv ', 'resume', 'unduh', 'download', 'curriculum'],
      answer: T('i_cv'), links: () => [{ label: T('i_cv_btn'), href: CT.cv, download: true }] });

    add({ key: 'hire', sec: 'contact', src: ['hero.tsx', 'contact.json'],
      kw: ['open to work', 'tersedia', 'rekrut', ' hire ', 'lowongan', 'available', 'kerja sama', 'kolaborasi', 'magang', 'hiring', 'internship', 'collaborate', 'opportunity', 'recruit'],
      answer: P.openToWork === false
        ? T('i_hire_no')
        : T('i_hire_yes', { focus: arr(P.next).length ? T('i_hire_focus', { next: arr(P.next).join(' / ') }) : '', mail: isReal(CT.email) ? T('i_hire_mail') : '' }),
      links: [{ label: T('i_open', { file: 'contact.json' }), goto: 'contact' }] });
    return out;
  }

  /* banner catatan konten: tampil bila membuka index.html?cek=1 */
  function showChecks(list) {
    if (list.length && window.console) console.warn('[content.js] ' + list.length + ' catatan:\n- ' + list.join('\n- '));
    if (!/[?&]cek\b/.test(window.location.search)) return;
    const box = document.createElement('div');
    box.setAttribute('style', 'position:fixed;left:.75rem;right:.75rem;bottom:.75rem;z-index:200;max-height:45vh;overflow:auto;background:#1b1f23;border:1px solid ' + (list.length ? '#d29922' : '#3fb950') + ';color:#e6e6e6;border-radius:8px;padding:.9rem 1rem;font:13px/1.6 "IBM Plex Sans",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.6)');
    box.innerHTML = '<b>' + (list.length ? '⚠ ' + list.length + ' catatan pada content.js' : '✓ content.js terbaca dengan baik') + '</b>' +
      (list.length ? '<ul style="margin:.5rem 0 0 1.1rem;list-style:disc">' + list.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '<div style="margin-top:.3rem;color:#9aa4ad">Tidak ada masalah yang terdeteksi.</div>') +
      '<button type="button" style="margin-top:.6rem;padding:.25rem .7rem;border:1px solid #444;border-radius:6px;color:#ccc" onclick="this.parentNode.remove()">Tutup</button>';
    document.body.appendChild(box);
  }


    function matchIntent(q) {
      const t = ' ' + String(q).toLowerCase().replace(/[^a-z0-9\s+#.\-]/g, ' ').replace(/\s+/g, ' ') + ' ';
      let best = null, bestScore = 0;
      for (const it of INTENTS) {
        let s = 0;
        for (const k of it.kw) { if (t.indexOf(k) !== -1) s += k.trim().length > 4 ? 2 : 1; }
        if (s > bestScore) { best = it; bestScore = s; }
      }
      return best;
    }

    /* ---------- MESIN PENCARIAN LOKAL (tanpa LLM, tanpa server) ---------- */
    const STOP = new Set(('yang dan di ke dari untuk apa siapa bagaimana gimana adalah itu ini dengan pada saja bisa dia nya atau juga ' +
      'sudah telah akan ada tidak bukan apakah kah lah dong deh sih kok ya mohon tolong kasih tahu tau sebutkan jelaskan ceritakan ' +
      'tentang soal mengenai daffa muhammad atha rizq dalam oleh para suatu agar supaya sebagai kalau jika maka karena sebuah lebih ' +
      'sangat dapat mau ingin saya kamu anda aku mu ku si dgn yg utk dr krn spt mana kapan berapa seperti sama punya miliki ' +
      'aja ga gak nggak enggak engga banget dimana dmn kemana darimana boleh minta bolehkah berikan beri lho loh toh kan nih tuh yuk ' +
      'and the of to is in me you your tell what who how about ' +
      'a an are was were be been do does did can could would should will shall have has had i my his him he she they their it its for with from as at on by this that these those there here please give show list which when where why any some more most very also than then just really mr he s main primary key major').split(' '));
    const SYN = {
      karir: 'karier', kerja: 'pengalaman', bekerja: 'pengalaman', pekerjaan: 'pengalaman', pernah: 'pengalaman', kuliah: 'pendidikan',
      sekolah: 'pendidikan', lulus: 'lulusan', nilai: 'ipk', gpa: 'ipk', tinggal: 'domisili', alamat: 'domisili', rumah: 'domisili',
      lokasi: 'domisili', resume: 'cv', wa: 'whatsapp', telp: 'whatsapp', telepon: 'whatsapp', hp: 'whatsapp', nomor: 'whatsapp',
      mail: 'email', surel: 'email', ecommerce: 'commerce', golang: 'go', tes: 'test', sertifikasi: 'sertifikat', cert: 'sertifikat',
      certificate: 'sertifikat', training: 'pelatihan', kursus: 'pelatihan', course: 'pelatihan', skill: 'keahlian', skills: 'keahlian',
      kemampuan: 'keahlian', kompetensi: 'keahlian', menguasai: 'keahlian', project: 'proyek', projects: 'proyek', karya: 'proyek',
      movie: 'film', recommendation: 'rekomendasi', recommender: 'rekomendasi', forecasting: 'prediksi', forecast: 'prediksi',
      ramalan: 'prediksi', demand: 'permintaan', hire: 'rekrut', lowongan: 'rekrut', magang: 'rekrut', tersedia: 'rekrut',
      available: 'rekrut', kolaborasi: 'rekrut', univ: 'universitas', kampus: 'universitas', bahasa: 'bahasa', sql: 'sql'
    };
    const SYN_EN = {
      job: 'experience', work: 'experience', employ: 'experience', employment: 'experience', school: 'education', university: 'education', college: 'education',
      degree: 'education', study: 'education', graduat: 'education', certification: 'certificate', cert: 'certificate', course: 'training', ability: 'skill',
      capability: 'skill', expertise: 'skill', competency: 'skill', technology: 'skill', stack: 'skill', phone: 'whatsapp', number: 'whatsapp', call: 'whatsapp',
      mail: 'email', reach: 'contact', address: 'location', live: 'location', city: 'location', resume: 'cv', hir: 'hire', hiring: 'hire', recruit: 'hire',
      available: 'hire', availability: 'hire', opportunity: 'hire', internship: 'hire', intern: 'hire', collaborate: 'hire', collaboration: 'hire',
      movie: 'film', recommendation: 'recommender', recommend: 'recommender', forecasting: 'forecast', ecommerce: 'commerce', golang: 'go', test: 'test'
    };
    function fold(s) {
      return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function stem(w) {
      if (/\d/.test(w) || w.length < 6) return w;
      let r = w.replace(/(nya|lah|kah|pun)$/, '');
      if (r.length >= 6) r = r.replace(/^(meng|meny|mem|men|ber|per|pel|ter|di|ke|se|me|pe)/, '');
      if (r.length >= 6) r = r.replace(/(kan|an|i)$/, '');
      return r.length >= 4 ? r : w;
    }
    function stemEn(w) {
      if (/\d/.test(w) || w.length < 4) return w;
      if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
      if (/(ss|us|is)$/.test(w)) return w;
      if (/s$/.test(w)) w = w.slice(0, -1);
      if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
      else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
      return w;
    }
    function tok(s) {
      const out = [];
      fold(s).split(' ').forEach((w) => {
        w = w.replace(/^\.+|\.+$/g, '');
        if (!w || STOP.has(w)) return;
        if (w.length < 2 && !/\d/.test(w)) return;
        if (LANG === 'en') {
          w = stemEn(w);
          if (STOP.has(w)) return;
          out.push(SYN_EN[w] || w);
          return;
        }
        if (SYN[w]) w = SYN[w];
        out.push(stem(w));
      });
      return out;
    }
    function lev(a, b, max) {
      if (Math.abs(a.length - b.length) > max) return max + 1;
      let prev = [], cur = [];
      for (let j = 0; j <= b.length; j++) prev[j] = j;
      for (let i = 1; i <= a.length; i++) {
        cur = [i]; let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
          if (cur[j] < rowMin) rowMin = cur[j];
        }
        if (rowMin > max) return max + 1;
        prev = cur;
      }
      return prev[b.length];
    }
    function makeIndex(chunks) {
      const df = Object.create(null); let total = 0;
      chunks.forEach((c) => {
        c.tf = Object.create(null);
        c.toks.forEach((t) => { c.tf[t] = (c.tf[t] || 0) + 1; });
        Object.keys(c.tf).forEach((t) => { df[t] = (df[t] || 0) + 1; });
        total += c.toks.length;
      });
      return { chunks, df, avg: total / Math.max(1, chunks.length), vocab: Object.keys(df) };
    }
    function fixTok(ix, t) {            // koreksi typo ringan: "sertifkat" -> "sertifikat"
      if (ix.df[t] || t.length < 5 || /\d/.test(t)) return t;
      const max = t.length >= 9 ? 2 : 1; let best = t, bd = max + 1;
      for (const v of ix.vocab) { const d = lev(t, v, max); if (d < bd) { bd = d; best = v; } }
      return best;
    }
    function search(ix, qt) {           // BM25 sederhana
      const N = ix.chunks.length, k1 = 1.4, b = 0.6, idf = {};
      const uniq = Array.from(new Set(qt));
      uniq.forEach((t) => { const d = ix.df[t] || 0; idf[t] = d ? Math.log(1 + (N - d + 0.5) / (d + 0.5)) : 0; });
      const ranked = ix.chunks.map((c) => {
        let s = 0;
        uniq.forEach((t) => { const f = c.tf[t]; if (f) s += idf[t] * (f * (k1 + 1)) / (f + k1 * (1 - b + b * c.toks.length / ix.avg)); });
        return { c, score: s * (c.boost || 1) };
      }).filter((x) => x.score > 0).sort((a, z) => z.score - a.score);
      return { ranked, idf };
    }
    function splitSent(t) {
      return String(t).replace(/([.!?])\s+/g, '$1\u0001').split(/\u0001|\n/).map((s) => s.trim()).filter((s) => s.length > 2);
    }
    function compose(ranked, idf, qt) {   // ambil kalimat paling relevan dari beberapa potongan teratas
      const picks = [];
      ranked.slice(0, 4).forEach((r, ri) => {
        splitSent(r.c.text).forEach((s, si) => {
          const st = new Set(tok(s)); let sc = 0;
          qt.forEach((t) => { if (st.has(t)) sc += idf[t] || 0; });
          if (sc > 0) picks.push({ s, sc: sc + (4 - ri) * 0.15, ri, si, sec: r.c.sec, title: r.c.title });
        });
      });
      picks.sort((a, z) => z.sc - a.sc);
      const chosen = [], seen = new Set(); let len = 0;
      for (const p of picks) {
        const key = p.s.slice(0, 40);
        if (seen.has(key)) continue;
        if (chosen.length && len + p.s.length > 520) break;
        seen.add(key); chosen.push(p); len += p.s.length;
        if (chosen.length >= 3) break;
      }
      return chosen.sort((a, z) => a.ri - z.ri || a.si - z.si);
    }
    function smallTalk(raw) {
      const t = fold(raw);
      if (/(siapa (kamu|anda|namamu)|^(kamu|anda) siapa|(kamu|anda) (itu )?(ai|bot|robot|manusia|chatgpt|llm)\b|apakah (kamu|anda)|(kamu|anda) (pakai|menggunakan|dibuat)|who are you|what are you|are you (an? )?(ai|bot|robot|human|real|chatgpt|llm)|how (are|were) you (built|made))/.test(t)) return 'identity';
      if (/((kamu|anda) (bisa|dapat) (apa|bantu)|^(help|bantuan|menu)$|what can you (do|help)|how can you help)/.test(t)) return 'capability';
      if (/\b(terima kasih|makasih|thanks|thank you|thx|trims|appreciate it)\b/.test(t)) return 'thanks';
      if (/^(dadah|bye|goodbye|see you|sampai jumpa|selamat tinggal|sampai ketemu)/.test(t)) return 'bye';
      const ws = t.split(' ');
      const G1 = /^(halo|hallo|hai|hi|hello|hey|permisi|assalamualaikum|selamat|good|greetings)$/;
      const G2 = /^(halo|hallo|hai|hi|hello|hey|permisi|assalamualaikum|selamat|good|greetings|pagi|siang|sore|malam|morning|afternoon|evening|there|everyone|bro|kak|kakak|min|agent|daffa|wr|wb|ya)$/;
      if (ws.length <= 5 && G1.test(ws[0]) && ws.every((w) => G2.test(w))) return 'greet';
      return null;
    }

    /* TEST-END */

    /* ================================================================
       6. NAVIGASI & MODE TAMPILAN
       ================================================================ */
    let mode = 'code';

    function goTo(id) {
      const reader = document.body.classList.contains('reader-mode');
      const el = document.getElementById(reader ? 'r-' + id : id);
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    function setMode(m, keepScroll) {
      mode = m;
      document.body.classList.toggle('reader-mode', m === 'reader');
      $('#seg-code').classList.toggle('on', m === 'code');
      $('#seg-reader').classList.toggle('on', m === 'reader');
      $('#seg-code').setAttribute('aria-pressed', String(m === 'code'));
      $('#seg-reader').setAttribute('aria-pressed', String(m === 'reader'));
      $('#title-text').textContent = m === 'reader' ? ((C.site && C.site.titleBarReader) || 'Tampilan Ringkas') : ((C.site && C.site.titleBar) || 'portfolio');
      store.set('daffa_mode', m);
      closeDrawer();
      endTour();
      if (!keepScroll) jumpTop();
      updateActive();
    }

    function setHelp(on) {
      document.body.classList.toggle('no-help', !on);
      const b = $('#btn-help-toggle');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      store.set('daffa_help', on ? 'on' : 'off');
    }

    /* drawer (mobile) */
    function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-backdrop').classList.add('open'); }
    function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-backdrop').classList.remove('open'); }

    /* scrollspy: bagian aktif = bagian terakhir yang bagian atasnya sudah melewati garis acuan */
    function updateActive() {
      const reader = document.body.classList.contains('reader-mode');
      const ids = reader ? READER_NAV.map((n) => 'r-' + n.id) : FILES.filter((f) => f.id).map((f) => f.id);
      const line = reader ? 140 : 180;
      let active = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) active = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6) active = ids[ids.length - 1];

      if (reader) {
        $$('#r-pills .r-pill').forEach((p) => {
          const on = 'r-' + p.dataset.id === active;
          p.classList.toggle('active', on);
          if (on) {
            const box = $('#r-pills');
            if (p.offsetLeft < box.scrollLeft || p.offsetLeft + p.offsetWidth > box.scrollLeft + box.clientWidth) {
              box.scrollLeft = Math.max(0, p.offsetLeft - 24);
            }
          }
        });
      } else {
        $$('.file-link[data-target], .tab').forEach((l) => l.classList.toggle('active', l.dataset.target === active));
        const f = FILES.find((x) => x.id === active);
        if (f) {
          $('#breadcrumb-file').textContent = f.child ? 'projects/' + f.name : f.name;
          $('#breadcrumb-sub').textContent = f.sub;
        }
        const t = $('.tab.active'), box = $('#tabs');
        if (t && box && (t.offsetLeft < box.scrollLeft || t.offsetLeft + t.offsetWidth > box.scrollLeft + box.clientWidth)) {
          box.scrollLeft = Math.max(0, t.offsetLeft - 40);
        }
      }
    }

    /* ================================================================
       7. ANIMASI: typewriter, count-up, reveal
       ================================================================ */
    let twRun = 0;
    function initTypewriter() {
      const run = ++twRun;
      const roles = arr(P.roles).length ? P.roles : [P.headline || ''];
      const el = $('#role-text');
      if (!el) return;
      if (reduceMotion) { el.textContent = roles[0]; return; }
      let ri = 0, ci = 0, del = false, heroOn = true;
      const heroEl = $('#hero');
      if (heroEl && 'IntersectionObserver' in window) {
        new IntersectionObserver((es) => { heroOn = es[0].isIntersecting; }).observe(heroEl);
      }
      (function loop() {
        if (run !== twRun) return;
        if (document.hidden || !heroOn) { setTimeout(loop, 600); return; }
        const w = roles[ri];
        el.textContent = del ? w.slice(0, ci--) : w.slice(0, ci++);
        let d = del ? 28 : 50;
        if (!del && ci === w.length + 1) { d = 1500; del = true; }
        if (del && ci === 0) { del = false; ri = (ri + 1) % roles.length; d = 350; }
        setTimeout(loop, d);
      })();
    }

    function animateCount(el) {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const suf = el.dataset.suffix || '';
      const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (reduceMotion) { el.textContent = fmt(target); return; }
      const dur = 1100, t0 = performance.now();
      (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }

    function initObservers() {
      $$('[data-stagger]').forEach((g) => {
        Array.prototype.forEach.call(g.children, (c, i) => {
          c.classList.add('reveal');
          c.style.transitionDelay = Math.min(i * 60, window.innerWidth < 640 ? 240 : 480) + 'ms';
        });
      });
      const rv = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); rv.unobserve(e.target); }
      }), { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      $$('.reveal').forEach((el) => rv.observe(el));

      const co = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); }
      }), { threshold: 0.4 });
      $$('.count-up').forEach((el) => co.observe(el));
    }

    /* ================================================================
       8. TUR SINGKAT
       ================================================================ */
    const tourCode = () => [
      { sel: '#explorer', alt: '#drawer-btn', title: T('tc1_t'), text: T('tc1_x') },
      { sel: '#tabs', title: T('tc2_t'), text: T('tc2_x') },
      { sel: '#btn-help-toggle', title: T('tc3_t'), text: T('tc3_x') },
      { sel: '.seg', title: T('tc4_t'), text: T('tc4_x') },
      { sel: '#titlebar .lang-seg', title: T('tc5_t'), text: T('tc5_x') },
      { sel: '#agent-fab', title: T('tc6_t'), text: T('tc6_x') }
    ];
    const tourReader = () => [
      { sel: '#r-pills', title: T('tr1_t'), text: T('tr1_x') },
      { sel: '.seg', title: T('tr2_t'), text: T('tr2_x') },
      { sel: '#titlebar .lang-seg', title: T('tr3_t'), text: T('tr3_x') },
      { sel: '#agent-fab', title: T('tr4_t'), text: T('tr4_x') }
    ];
    let tourSteps = [], tourIdx = 0;

    function isVisible(el) { return !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
    function buildTour() {
      const defs = document.body.classList.contains('reader-mode') ? tourReader() : tourCode();
      return defs.map((d) => {
        const el = [d.sel, d.alt].filter(Boolean).map((s) => $(s)).find(isVisible);
        return el ? { el: el, title: d.title, text: d.text } : null;
      }).filter(Boolean);
    }
    function showTour() {
      $$('.tour-hl').forEach((e) => e.classList.remove('tour-hl'));
      const s = tourSteps[tourIdx];
      s.el.classList.add('tour-hl');
      $('#tour-count').textContent = (tourIdx + 1) + ' / ' + tourSteps.length;
      $('#tour-title').textContent = s.title;
      $('#tour-text').textContent = s.text;
      $('#tour-prev').style.visibility = tourIdx ? 'visible' : 'hidden';
      $('#tour-next').textContent = tourIdx === tourSteps.length - 1 ? T('tour_done') : T('tour_next');
    }
    function startTour() {
      closeAgent(); closeDrawer(); closeWelcome();
      tourSteps = buildTour();
      if (!tourSteps.length) return;
      tourIdx = 0;
      $('#tour').classList.add('open');
      showTour();
    }
    function endTour() {
      $('#tour').classList.remove('open');
      $$('.tour-hl').forEach((e) => e.classList.remove('tour-hl'));
    }

    /* ================================================================
       9. MODAL SAMBUTAN
       ================================================================ */
    function openWelcome() { $('#welcome').classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeWelcome() { $('#welcome').classList.remove('open'); document.body.style.overflow = ''; }

    /* ================================================================
       10. DAFFA-AGENT (tanya bebas: model AI bila endpoint diisi, selain itu pencarian lokal)
       ================================================================ */
    const agentEl = $('#agent'), logEl = $('#agent-log'), inputEl = $('#agent-input'), fabEl = $('#agent-fab');
    let busy = false, greeted = false, kbIx = null, lastQt = [], chatHist = [];
    const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
    const scrollLog = () => { logEl.scrollTop = logEl.scrollHeight; };
    const fmtAnswer = (t) => esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<b class="text-white font-semibold">$1</b>')
      .replace(/^\s*[-*] /gm, '• ')
      .replace(/\n/g, '<br>');
    const remoteOn = () => !!(CONFIG.agent && CONFIG.agent.endpoint);
    const SEC_LABEL = (id) => (READER_NAV.find((n) => n.id === id) || {}).label || id;
    const SEC_FILE = (id) => (FILES.find((f) => f.id === id) || {}).name || id;

    /* ---------- basis pengetahuan: dibangun dari isi halaman ini (selalu sinkron dengan konten) ---------- */
    function buildKB() {
      const chunks = [];
      const add = (sec, title, text, boost, extra, it, meta) => {
        text = String(text).replace(/\s+/g, ' ').trim();
        if (text.length < 10) return;
        const toks = tok(title + ' ' + text + ' ' + (extra || ''));
        if (toks.length) chunks.push(Object.assign({ sec, title, text, toks, boost: boost || 1, it: it || null }, meta || {}));
      };
      INTENTS.forEach((it) => {
        if (it.key === 'greet') return;
        const ans = typeof it.answer === 'function' ? it.answer() : it.answer;
        const sec = it.sec || 'hero';
        add(sec, SEC_LABEL(sec), ans, it.boost || 1.5, it.kw.join(' '), it);
      });
      $$('#reader section[id^="r-"]').forEach((sec) => {
        const id = sec.id.slice(2), hd = sec.querySelector('h1,h2');
        const title = hd ? hd.textContent.replace(/\s+/g, ' ').trim() : SEC_LABEL(id);
        let buf = '', label = '';
        const flush = () => { if (buf) add(id, title, buf, 1); buf = ''; };
        $$('h3,h4,p,li,dt,dd', sec).forEach((el) => {
          const t = el.textContent.replace(/\s+/g, ' ').trim();
          if (!t || /^[\d.,+%×x\s]*$/.test(t)) return;
          if (t.length < 22 && !/[.!?]$/.test(t)) { label = t; return; }
          const line = (label ? label + ': ' : '') + t; label = '';
          if (buf.length + line.length > 340) flush();
          buf += (buf ? ' ' : '') + (/[.!?]$/.test(line) ? line : line + '.');
        });
        flush();
      });
      SKILLS.forEach((g) => add('skills', g.title, g.title + ': ' + g.desc + ' ' + g.items.join(', ') + '.', 1.1));
      Object.keys(TIPS).forEach((k) => add('skills', T('glossary'), k + ' — ' + TIPS[k], 0.8, k, null, { tip: true }));
      CERTS.forEach((g) => g.items.forEach((c) =>
        add('certificates', c.t, T('cert_word') + ' ' + c.t + ' (' + c.en + '), ' + (c.by || (C.certificates && C.certificates.defaultIssuer) || '') + ', ' + c.d + '.', 1.1, g.group, null, { cert: c })));
      return chunks;
    }
    function ensureKB() { if (!kbIx) kbIx = makeIndex(buildKB()); return kbIx; }

    const TALK = {
      greet: () => GREETING,
      thanks: () => T('t_thanks'),
      bye: () => T('t_bye'),
      identity: () => (remoteOn() ? T('t_id_ai') : T('t_id_local')),
      capability: () => T('t_cap', { nproj: nProj(), ncert: nCert() })
    };
    const waLink = () => ({ label: T('i_chat_wa'), href: cfgFill('https://wa.me/{whatsapp}') });
    function oosAnswer() {
      return {
        text: T('oos'),
        links: [waLink(), { label: T('oos_skills'), goto: 'skills' }, { label: T('oos_projects'), goto: 'project-01' }], src: []
      };
    }
    function localAnswer(q) {
      const ix = ensureKB();
      const talk = smallTalk(q);
      if (talk) return { text: TALK[talk](), links: [], src: [] };
      let qt = tok(q).map((t) => fixTok(ix, t));
      const N = ix.chunks.length;
      const uniq0 = Array.from(new Set(qt));
      const unk0 = uniq0.filter((t) => !ix.df[t]).length;
      if (uniq0.length && unk0 >= uniq0.length - unk0) return oosAnswer();   // separuh+ kata kunci tidak dikenal = di luar topik
      const strong = qt.filter((t) => ix.df[t] && ix.df[t] < N * 0.2);
      if (!strong.length && lastQt.length) qt = lastQt.concat(qt);      // pertanyaan lanjutan: pakai topik sebelumnya
      const { ranked, idf } = search(ix, qt);
      if (!ranked.length || ranked[0].score < 1.5) return oosAnswer();
      lastQt = qt.filter((t) => ix.df[t] && ix.df[t] < N * 0.2).slice(0, 8);
      const top = ranked[0].c;
      const tn = fold(q);
      if (/^(apa (itu|arti|maksud)|apakah itu|maksud|definisi|what is|what does|define|meaning of)/.test(tn) && strong.length <= 2) {      // pertanyaan definisi istilah
        const tp = ranked.slice(0, 8).find((r) => r.c.tip && tok(r.c.text.split(' — ')[0]).some((t) => uniq0.includes(fixTok(ix, t)) || uniq0.includes(t)));   // istilah harus benar-benar disebut di pertanyaan
        if (tp) return { text: '**' + tp.c.text.split(' — ')[0] + '**\n' + tp.c.text.split(' — ').slice(1).join(' — '),
                         links: [{ label: T('oos_skills'), goto: 'skills' }], src: ['skills.json'] };
      }
      if (top.sec === 'certificates') {                                // pertanyaan spesifik tentang sertifikat tertentu
        const generic = new Set(tok('sertifikat pelatihan training sertifikasi kursus certificate certification course'));
        const spec = uniq0.filter((t) => !generic.has(t));
        const hits = spec.length ? ix.chunks.filter((c) => c.cert && spec.some((t) => c.tf[t])) : [];
        if (hits.length && hits.length < ix.chunks.filter((c) => c.cert).length) {
          return { text: '**' + T('related_certs') + '**\n' + hits.map((c) => '• ' + c.cert.t + ' (' + c.cert.en + ') — ' + (c.cert.by || (C.certificates && C.certificates.defaultIssuer) || '') + ', ' + c.cert.d).join('\n'),
                   links: [{ label: T('open_certs'), goto: 'certificates' }], src: ['certificates.json'] };
        }
      }
      if (top.it) {
        const it = top.it;
        if (it.key === 'contact' && /\b(email|e mail|surel|mail)\b/.test(tn) && !isReal(CONFIG.email)) {
          return { text: T('no_email'),
                   links: [waLink(), { label: T('i_open', { file: 'contact.json' }), goto: 'contact' }], src: ['contact.json'] };
        }
        return { text: typeof it.answer === 'function' ? it.answer() : it.answer,
                 links: typeof it.links === 'function' ? it.links() : (it.links || []), src: it.src || [] };
      }
      const chosen = compose(ranked, idf, qt);
      if (!chosen.length) return oosAnswer();
      const groups = [];
      chosen.forEach((p) => {
        let g = groups.find((x) => x.sec === p.sec && x.title === p.title);
        if (!g) { g = { sec: p.sec, title: p.title, lines: [] }; groups.push(g); }
        g.lines.push(p.s);
      });
      const text = groups.map((g) => '**' + g.title + '**\n' + g.lines.join(' ')).join('\n');
      const links = [], seen = new Set();
      groups.forEach((g) => { if (!seen.has(g.sec)) { seen.add(g.sec); links.push({ label: SEC_LABEL(g.sec), goto: g.sec }); } });
      return { text, links: links.slice(0, 3), src: links.slice(0, 3).map((l) => SEC_FILE(l.goto)) };
    }
    function relatedLinks(text) {
      const ix = ensureKB();
      const { ranked } = search(ix, tok(text));
      const out = [], seen = new Set();
      for (const r of ranked.slice(0, 8)) {
        if (seen.has(r.c.sec) || !FILES.some((f) => f.id === r.c.sec)) continue;
        seen.add(r.c.sec); out.push({ label: SEC_LABEL(r.c.sec), goto: r.c.sec });
        if (out.length >= 2) break;
      }
      return out;
    }
    async function remoteAnswer(messages) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), (CONFIG.agent && CONFIG.agent.timeoutMs) || 25000);
      try {
        const r = await fetch(CONFIG.agent.endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }), signal: ctl.signal
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!d || typeof d.answer !== 'string' || !d.answer.trim()) throw new Error('jawaban kosong');
        return d.answer.trim();
      } finally { clearTimeout(to); }
    }

    /* ---------- UI chat ---------- */
    function addUser(t) {
      const d = document.createElement('div');
      d.className = 'a-user'; d.textContent = t;
      logEl.appendChild(d); scrollLog();
    }
    function addBot() {
      const w = document.createElement('div');
      w.className = 'a-bot';
      w.innerHTML = '<div class="a-trace"></div><div class="a-text" hidden></div><div class="a-links"></div>';
      logEl.appendChild(w);
      return { trace: w.children[0], text: w.children[1], links: w.children[2] };
    }
    function addStep(b, html) { const d = document.createElement('div'); d.innerHTML = html; b.trace.appendChild(d); scrollLog(); }
    async function typeInto(el, raw) {
      el.hidden = false;
      const plain = raw.replace(/\*\*/g, '');
      if (reduceMotion) { el.innerHTML = fmtAnswer(raw); return; }
      el.classList.add('whitespace-pre-wrap');
      const parts = plain.split(/(\s+)/), fast = parts.length > 160;
      let out = '';
      for (const p of parts) {
        out += p; el.textContent = out; scrollLog();
        if (p.trim()) await sleep(fast ? 8 : 20);
      }
      el.classList.remove('whitespace-pre-wrap');
      el.innerHTML = fmtAnswer(raw);
    }
    function renderLinks(box, list) {
      box.innerHTML = (list || []).map((l) => l.goto
        ? '<button type="button" class="chip go" data-goto="' + esc(l.goto) + '">' + esc(l.label) + '</button>'
        : '<a class="chip go" href="' + esc(l.href) + '" ' + (l.download ? 'download' : 'target="_blank" rel="noopener"') + '>' + esc(l.label) + '</a>'
      ).join('');
    }
    function setBusy(on) {
      inputEl.disabled = on;
      $('#agent-form button[type="submit"]').disabled = on;
    }
    function autosize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px'; }
    function updateAgentMode() {
      const on = remoteOn(), bd = $('#agent-badge');
      bd.textContent = on ? T('ag_badge_ai') : T('ag_badge_local'); bd.classList.toggle('ai', on);
      bd.title = on ? T('ag_tip_ai') : T('ag_tip_local');
      $('#agent-note').textContent = on ? T('ag_note_ai') : T('ag_note_local');
    }
    const chipsWrap = () => $('#agent-chips-wrap');

    async function ask(q) {
      q = String(q).trim().slice(0, 500);
      if (!q || busy) return;
      busy = true; setBusy(true);
      chipsWrap().hidden = true;
      addUser(q);
      chatHist.push({ role: 'user', content: q });
      const b = addBot();
      b.text.hidden = false;
      b.text.innerHTML = '<span class="a-dots" role="status" aria-label="' + esc(T('ag_thinking')) + '"><span></span><span></span><span></span></span>';
      let res = null;
      try {
        if (remoteOn()) {
          addStep(b, T('ag_asking_ai'));
          try {
            const text = await remoteAnswer(chatHist.slice(-9));
            res = { text, links: relatedLinks(q + ' ' + text) };
          } catch (e) { addStep(b, T('ag_fallback')); }
        }
        if (!res) {
          addStep(b, T('ag_searching'));
          await sleep(220);
          res = localAnswer(q);
          (res.src || []).forEach((f) => addStep(b, T('ag_reading') + ' <span class="src">' + esc(f) + '</span>'));
        }
        await typeInto(b.text, res.text);
        renderLinks(b.links, res.links);
        chatHist.push({ role: 'assistant', content: res.text });
        if (chatHist.length > 20) chatHist = chatHist.slice(-20);
      } catch (e) {
        b.text.textContent = T('ag_error');
      }
      scrollLog();
      busy = false; setBusy(false);
      if (window.innerWidth >= 768) inputEl.focus();
    }
    function greet() {
      const b = addBot();
      b.trace.remove();
      b.text.hidden = false;
      b.text.innerHTML = fmtAnswer(GREETING);
      greeted = true;
    }
    function resetAgent() {
      logEl.innerHTML = ''; busy = false; setBusy(false);
      chatHist = []; lastQt = []; greeted = false;
      chipsWrap().hidden = false; updateAgentMode(); greet();
    }
    function openAgent() {
      endTour(); closeDrawer();
      agentEl.classList.add('open');
      fabEl.style.display = 'none';
      updateAgentMode();
      if (!greeted) greet();
      fitAgent();
      if (window.innerWidth >= 768) inputEl.focus();
    }
    function closeAgent() {
      agentEl.classList.remove('open');
      fabEl.style.display = 'flex';
      fitAgent();
    }

    /* ================================================================
       10b. OPTIMASI MOBILE
       ================================================================ */
    const isCoarse = window.matchMedia('(hover: none)').matches;

    /* tooltip istilah: di HP muncul saat diketuk, posisinya dijaga agar tidak keluar layar */
    function initTouchTips() {
      if (!isCoarse) return;
      document.documentElement.classList.add('is-touch');
      const pop = document.createElement('div');
      pop.id = 'tip-pop'; pop.setAttribute('role', 'tooltip');
      document.body.appendChild(pop);
      let timer = null, y0 = 0;
      const hide = () => { pop.style.display = 'none'; clearTimeout(timer); };
      const show = (el) => {
        pop.textContent = el.getAttribute('data-tip');
        pop.style.display = 'block';
        const r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
        const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
        let top = r.top - h - 10;
        if (top < 56) top = r.bottom + 10;
        pop.style.left = left + 'px'; pop.style.top = top + 'px';
        y0 = window.scrollY;
        clearTimeout(timer); timer = setTimeout(hide, 7000);
      };
      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tip]');
        if (t) show(t); else hide();
      }, true);
      window.addEventListener('scroll', () => { if (Math.abs(window.scrollY - y0) > 24) hide(); }, { passive: true });
    }

    /* panel agent tetap terlihat saat keyboard HP muncul (visualViewport) */
    function fitAgent() {
      const vv = window.visualViewport;
      if (!agentEl.classList.contains('open') || !vv || window.innerWidth >= 640) {
        agentEl.style.bottom = ''; agentEl.style.height = ''; agentEl.classList.remove('kb-open');
        return;
      }
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      const typing = kb > 120;
      agentEl.classList.toggle('kb-open', typing);
      if (typing) {
        agentEl.style.bottom = (kb + 8) + 'px';
        agentEl.style.height = Math.max(240, Math.min(vv.height - 16, 560)) + 'px';
      } else {
        agentEl.style.bottom = ''; agentEl.style.height = '';
      }
    }

    /* ================================================================
       11. EVENT
       ================================================================ */
    function bindEvents() {
      document.addEventListener('click', (e) => {
        const lg = e.target.closest('[data-lang]');
        if (lg) { switchLang(lg.dataset.lang); return; }
        const lbt = e.target.closest('[data-lb]');
        if (lbt) { openLightbox(lbt.dataset.lb, parseInt(lbt.dataset.i, 10) || 0); return; }
        const a = e.target.closest('[data-action]');
        if (a) {
          const act = a.dataset.action;
          if (act === 'mode-reader') setMode('reader');
          else if (act === 'mode-code') setMode('code');
          else if (act === 'toggle-mode') setMode(mode === 'code' ? 'reader' : 'code');
          else if (act === 'open-agent') openAgent();
          else if (act === 'start-tour') startTour();
          return;
        }
        const g = e.target.closest('[data-goto]');
        if (g) { goTo(g.dataset.goto); if (window.innerWidth < 640) closeAgent(); return; }
        const q = e.target.closest('[data-q]');
        if (q) { ask(q.dataset.q); return; }
        const fl = e.target.closest('#drawer .file-link');
        if (fl) closeDrawer();
      });

      $$('.seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
      $('#btn-help-toggle').addEventListener('click', () => setHelp(document.body.classList.contains('no-help')));
      $('#btn-tour').addEventListener('click', startTour);
      $('#drawer-btn').addEventListener('click', () => ($('#drawer').classList.contains('open') ? closeDrawer() : openDrawer()));
      $('#drawer-backdrop').addEventListener('click', closeDrawer);

      /* pencarian bagian di sidebar */
      const filterEl = $('#file-filter');
      filterEl.addEventListener('input', () => {
        const q = filterEl.value.trim().toLowerCase();
        let shown = 0;
        $$('#file-list .file-item').forEach((a) => {
          const ok = !q || a.dataset.search.indexOf(q) !== -1;
          a.style.display = ok ? '' : 'none';
          if (ok) shown++;
        });
        $$('#file-list [data-folder]').forEach((d) => { d.style.display = q ? 'none' : ''; });
        $('#file-empty').style.display = shown ? 'none' : 'block';
      });
      filterEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { const first = $$('#file-list .file-item').find((a) => a.style.display !== 'none'); if (first) first.click(); }
      });
      $('#act-search').addEventListener('click', () => filterEl.focus());

      /* modal sambutan */
      $$('[data-welcome]').forEach((b) => b.addEventListener('click', () => {
        const m = b.dataset.welcome;
        store.set('daffa_seen', '1');
        closeWelcome();
        setMode(m);
        if (m === 'code' && $('#welcome-tour').checked) setTimeout(startTour, 400);
      }));

      /* tur */
      $('#tour-next').addEventListener('click', () => { if (tourIdx >= tourSteps.length - 1) endTour(); else { tourIdx++; showTour(); } });
      $('#tour-prev').addEventListener('click', () => { if (tourIdx > 0) { tourIdx--; showTour(); } });
      $('#tour-skip').addEventListener('click', endTour);

      /* agent */
      $('#agent-close').addEventListener('click', closeAgent);
      fabEl.addEventListener('click', openAgent);
      $('#agent-clear').addEventListener('click', resetAgent);
      $('#agent-form').addEventListener('submit', (e) => { e.preventDefault(); const v = inputEl.value; inputEl.value = ''; autosize(); ask(v); });
      inputEl.addEventListener('input', autosize);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#agent-form').requestSubmit(); }
      });

      /* lightbox */
      $('#lb-close').addEventListener('click', closeLightbox);
      $('#lb-prev').addEventListener('click', () => stepLightbox(-1));
      $('#lb-next').addEventListener('click', () => stepLightbox(1));
      $('#lightbox').addEventListener('click', (e) => { if (!e.target.closest('.lb-fig, .lb-nav, .lb-close')) closeLightbox(); });
      let tx = null;
      $('#lightbox').addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
      $('#lightbox').addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 60) stepLightbox(dx < 0 ? 1 : -1); }, { passive: true });

      /* keyboard */
      document.addEventListener('keydown', (e) => {
        if (!$('#lightbox').hidden) {
          if (e.key === 'Escape') closeLightbox();
          else if (e.key === 'ArrowLeft') stepLightbox(-1);
          else if (e.key === 'ArrowRight') stepLightbox(1);
          return;
        }
        if (e.key !== 'Escape') return;
        if ($('#welcome').classList.contains('open')) { store.set('daffa_seen', '1'); closeWelcome(); return; }
        if ($('#tour').classList.contains('open')) { endTour(); return; }
        if (agentEl.classList.contains('open')) { closeAgent(); return; }
        closeDrawer();
      });

      /* scroll & resize */
      let ticking = false;
      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { updateActive(); ticking = false; }); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }

    /* ================================================================
       12. STATUS BAR
       ================================================================ */
    let statusMsgs = ['open to work'], statusI = 0;
    function statusReset() {
      statusMsgs = arr(C.site && C.site.statusMessages).length ? C.site.statusMessages : ['open to work'];
      statusI = 0;
      const m = $('#status-msg'); if (m) m.textContent = statusMsgs[0];
    }
    function initStatusBar() {
      const clock = $('#clock'), msg = $('#status-msg');
      const tick = () => {
        const n = new Date();
        clock.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
      };
      tick(); setInterval(tick, 15000);
      statusReset();
      setInterval(() => { statusI = (statusI + 1) % statusMsgs.length; msg.textContent = statusMsgs[statusI]; }, 7000);
    }

    /* ================================================================
       12b. BAHASA (ID / EN) & LIGHTBOX GAMBAR DOKUMENTASI
       ================================================================ */
    function applyStatic() {
      document.documentElement.lang = LANG;
      $$('[data-i18n]').forEach((el) => { el.textContent = T(el.dataset.i18n); });
      $$('[data-i18n-html]').forEach((el) => { el.innerHTML = T(el.dataset.i18nHtml); });
      $$('[data-i18n-attr]').forEach((el) => {
        el.dataset.i18nAttr.split(';').forEach((pair) => { const i = pair.indexOf(':'); if (i > 0) el.setAttribute(pair.slice(0, i), T(pair.slice(i + 1))); });
      });
      $$('[data-lang]').forEach((b) => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      const md = $('meta[name="description"]'); if (md) md.setAttribute('content', T('meta_desc'));
      const od = $('meta[property="og:description"]'); if (od) od.setAttribute('content', T('og_desc'));
    }
    function anchorSnapshot() {
      const reader = document.body.classList.contains('reader-mode');
      let cur = null;
      MODEL.forEach((s) => {
        const el = document.getElementById(reader ? 'r-' + s.id : s.id);
        if (el && el.getBoundingClientRect().top <= 150) cur = { id: reader ? 'r-' + s.id : s.id, top: el.getBoundingClientRect().top };
      });
      return cur;
    }
    function switchLang(l) {
      l = l === 'en' ? 'en' : 'id';
      if (l === LANG) return;
      const snap = anchorSnapshot();
      closeLightbox(); endTour(); closeDrawer();
      loadData(l);
      store.set('daffa_lang', LANG);
      applyStatic();
      renderAll();
      INTENTS = buildIntents();
      kbIx = null; lastQt = [];
      setMode(mode, true);
      icons(); initObservers(); initTypewriter(); statusReset();
      resetAgent();
      if (snap) {
        const el = document.getElementById(snap.id);
        if (el) {
          const h = document.documentElement, prev = h.style.scrollBehavior;
          h.style.scrollBehavior = 'auto';
          window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - snap.top);
          h.style.scrollBehavior = prev;
        }
      }
      updateActive();
    }

    let lbSet = [], lbIdx = 0, lbFocus = null;
    function showLightbox() {
      const f = lbSet[lbIdx]; if (!f) return;
      const img = $('#lb-img');
      img.classList.remove('tall');
      img.onload = () => { if (img.naturalHeight / Math.max(1, img.naturalWidth) > 1.3) img.classList.add('tall'); $('.lb-img').scrollTop = 0; };
      img.src = f.src; img.alt = f.caption || '';
      $('#lb-cap').textContent = f.caption || ''; $('#lb-note').textContent = f.note || '';
      $('#lb-count').textContent = (lbIdx + 1) + ' / ' + lbSet.length;
      $('#lb-prev').style.visibility = lbSet.length > 1 ? 'visible' : 'hidden';
      $('#lb-next').style.visibility = lbSet.length > 1 ? 'visible' : 'hidden';
    }
    function openLightbox(pid, i) {
      const sec = MODEL.find((s) => s.id === pid);
      if (!sec || !sec.p || !sec.p.docs) return;
      lbSet = arr(sec.p.docs.figures); lbIdx = Math.max(0, Math.min(i, lbSet.length - 1));
      lbFocus = document.activeElement;
      showLightbox();
      $('#lightbox').hidden = false; document.body.classList.add('lb-open');
      icons();
      $('#lb-close').focus();
    }
    function closeLightbox() {
      const lb = $('#lightbox');
      if (!lb || lb.hidden) return;
      lb.hidden = true; document.body.classList.remove('lb-open');
      if (lbFocus && lbFocus.focus) { try { lbFocus.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }
    }
    function stepLightbox(d) { if (!lbSet.length) return; lbIdx = (lbIdx + d + lbSet.length) % lbSet.length; showLightbox(); }

    /* ================================================================
       13. INISIALISASI
       ================================================================ */
    function init() {
      const params = new URLSearchParams(window.location.search);
      if (params.has('reset')) { store.del('daffa_seen'); store.del('daffa_mode'); store.del('daffa_help'); }

      const qLang = (params.get('lang') || '').toLowerCase();
      loadData(qLang === 'en' || qLang === 'id' ? qLang : (store.get('daffa_lang') === 'en' ? 'en' : 'id'));
      if (qLang === 'en' || qLang === 'id') store.set('daffa_lang', LANG);
      applyStatic();
      renderAll();
      INTENTS = buildIntents();
      showChecks(checkContent());
      icons();
      window.addEventListener('load', icons);          /* ikon di-render ulang setelah skrip Lucide (defer) selesai */
      initTouchTips();
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', fitAgent);
        window.visualViewport.addEventListener('scroll', fitAgent);
      }
      bindEvents();
      initObservers();
      initTypewriter();
      initStatusBar();

      setHelp(store.get('daffa_help') !== 'off');

      const view = (params.get('view') || '').toLowerCase();
      let initial = store.get('daffa_mode') === 'reader' ? 'reader' : 'code';
      if (view === 'ringkas' || view === 'reader') initial = 'reader';
      else if (view === 'code') initial = 'code';
      setMode(initial, true);

      if (window.matchMedia('(max-width: 639.98px)').matches) {
        const rc = $('[data-welcome="reader"]');
        if (rc && !rc.querySelector('.rec')) rc.insertAdjacentHTML('afterbegin', '<span class="rec" data-i18n="w_rec">' + esc(T('w_rec')) + '</span>');
      }
      if (!store.get('daffa_seen') && !view) openWelcome();
      else if (!store.get('daffa_seen')) store.set('daffa_seen', '1');

      /* sorot tombol agent sebentar agar pengunjung sadar fiturnya ada */
      if (!reduceMotion) setTimeout(() => { fabEl.classList.add('pulse'); }, 4000);
      updateActive();
    }

    init();
  })();
