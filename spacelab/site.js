(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { paused: reduce, skyVisible: true };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---- starfield ---- */
  const cv = $('#stars');
  const ctx = cv.getContext('2d');
  let stars = [], shoot = null, nextShoot = 6000, W = 0, H = 0, dpr = 1, sky = null;
  const tints = ['#f2f0fa', '#f2f0fa', '#f2f0fa', '#dcd6ff', '#c4b5fd', '#a5f3fc', '#fde9c4'];
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  // The still part of the sky (Milky Way band, nebula haze, faint dust) is painted once per resize.
  function paintSky() {
    sky = document.createElement('canvas');
    sky.width = W * dpr; sky.height = H * dpr;
    const g = sky.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#070914'; g.fillRect(0, 0, W, H);
    const bandW = Math.max(W, H) * 0.16;
    const along = (k) => [W * (-0.1 + 1.2 * k), H * (1.05 - 1.1 * k)];
    const nx = H * 1.1, ny = W * 1.2, nl = Math.hypot(nx, ny);
    for (let i = 0; i < 140; i++) {
      const [x, y] = along(Math.random()), o = gauss() * bandW * 0.8;
      g.globalAlpha = 0.018 + Math.random() * 0.02;
      g.fillStyle = pick(['#6d5bd0', '#4c6fd8', '#3aa7c4', '#8b5cf6']);
      g.beginPath(); g.arc(x + (o * nx) / nl, y + (o * ny) / nl, 40 + Math.random() * 120, 0, 6.283); g.fill();
    }
    const dust = Math.round((W * H) / (W < 700 ? 900 : 450));
    for (let i = 0; i < dust; i++) {
      const inBand = Math.random() < 0.6;
      let x, y;
      if (inBand) { const [bx, by] = along(Math.random()), o = gauss() * bandW; x = bx + (o * nx) / nl; y = by + (o * ny) / nl; } else { x = Math.random() * W; y = Math.random() * H; }
      g.globalAlpha = (inBand ? 0.25 : 0.15) + Math.random() * 0.35;
      g.fillStyle = pick(tints);
      g.fillRect(x, y, Math.random() < 0.85 ? 0.6 : 1, Math.random() < 0.85 ? 0.6 : 1);
    }
    g.globalAlpha = 1;
  }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSky();
    const n = Math.min(W < 700 ? 180 : 420, Math.round((W * H) / 3200));
    stars = Array.from({ length: n }, () => {
      const k = Math.random();
      const r = k < 0.82 ? 0.4 + Math.random() * 0.5 : k < 0.97 ? 0.9 + Math.random() * 0.6 : 1.6 + Math.random() * 0.7;
      return { x: Math.random() * W, y: Math.random() * H, r, a: 0.45 + Math.random() * 0.55, p: Math.random() * 6.28, s: Math.random() * 0.0016 + 0.0004, c: pick(tints), glint: r > 1.6 };
    });
    draw(performance.now());
  }
  function draw(t) {
    if (!sky || !sky.width || !sky.height) return;
    ctx.drawImage(sky, 0, 0, W, H);
    for (const s of stars) {
      const a = s.a * (state.paused ? 0.85 : 0.6 + 0.4 * Math.sin(t * s.s + s.p));
      ctx.fillStyle = s.c;
      if (s.glint) {
        ctx.globalAlpha = a * 0.16; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.2, 0, 6.283); ctx.fill();
        ctx.globalAlpha = a * 0.55; ctx.fillRect(s.x - s.r * 4, s.y - 0.35, s.r * 8, 0.7); ctx.fillRect(s.x - 0.35, s.y - s.r * 4, 0.7, s.r * 8);
      }
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    if (shoot) {
      const k = (t - shoot.t0) / 900;
      if (k >= 1) shoot = null;
      else {
        const x = shoot.x + shoot.dx * k, y = shoot.y + shoot.dy * k;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#f2f0fa'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shoot.dx * 0.12, y - shoot.dy * 0.12); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  let last = 0;
  function frame(t) {
    if (!state.paused && !document.hidden) {
      if (t - last > 33) {
        if (!shoot && t > nextShoot) { shoot = { t0: t, x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, dx: 260, dy: 130 }; nextShoot = t + 9000 + Math.random() * 9000; }
        draw(t); last = t;
      }
      planetsStep(t);
    }
    requestAnimationFrame(frame);
  }

  /* ---- pause ---- */
  const pauseBtn = $('#pause');
  function setPaused(p) {
    state.paused = p;
    document.documentElement.classList.toggle('paused', p);
    if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', String(p)); pauseBtn.textContent = p ? 'Play motion' : 'Pause motion'; }
    if (p) draw(performance.now());
  }
  if (pauseBtn) pauseBtn.addEventListener('click', () => setPaused(!state.paused));
  if (reduce) setPaused(true);

  /* ---- menu ---- */
  const menu = $('#menu'), nav = $('#nav');
  menu.addEventListener('click', () => { const o = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(o)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });

  /* ---- reveal ---- */
  const rv = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('in'));

  /* ---- star map ---- */
  const dataEl = $('#sky-data');
  let planetsStep = () => {};
  if (dataEl) {
    const D = JSON.parse(dataEl.textContent);
    const svg = $('#sky');
    const panelH = $('#sky-h'), panelP = $('#sky-p'), panelX = $('#sky-extra');
    const starById = Object.fromEntries(D.stars.map((s) => [s.id, s]));
    const bodyByKey = Object.fromEntries(D.bodies.map((b) => [b.key, b]));
    const els = {
      sys: Object.fromEntries($$('.sys', svg).map((g) => [g.dataset.s, { g, back: $('.back', g), front: $('.front', g) }])),
      star: $$('.star', svg),
      planet: $$('.planet', svg),
      orbit: $$('.orbit', svg),
      chain: $$('.chain', svg),
    };
    const planetById = {};
    els.planet.forEach((g) => { g.dataset.id = g.dataset.key + '@' + g.dataset.s; planetById[g.dataset.id] = g; });
    let view = D.views.all.slice(), anim = 0;
    const setVB = (v) => { view = v; svg.setAttribute('viewBox', v.join(' ')); };
    function goTo(target) {
      cancelAnimationFrame(anim);
      if (reduce) return setVB(target);
      const from = view.slice(), t0 = performance.now();
      const step = (t) => {
        const k = Math.min((t - t0) / 650, 1), e = 1 - Math.pow(1 - k, 3);
        setVB(from.map((v, i) => v + (target[i] - v) * e));
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    const around = (x, y, w = 520) => { const h = w * (D.h / D.w); return [Math.max(0, Math.min(D.w - w, x - w / 2)), Math.max(0, Math.min(D.h - h, y - h / 2)), w, h]; };

    // Depth: nearer systems (larger z) drift and parallax more; planets on the near half of an orbit
    // are larger, brighter and drawn in front of their star.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    if (matchMedia('(pointer: fine)').matches && !reduce) {
      addEventListener('pointermove', (e) => { pointer.tx = e.clientX / innerWidth - 0.5; pointer.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    }
    const drift = D.stars.map((st, i) => ({ id: st.id, z: st.z, ax: 8 + (i % 4) * 3, ay: 7 + (i % 3) * 4, fx: 0.00007 + (i % 5) * 0.000018, fy: 0.00009 + (i % 4) * 0.000016, px: i * 1.7, py: i * 2.3 }));
    const cur = {};
    const planetXY = {};
    function planetsStepImpl(t) {
      if (!state.skyVisible) return;
      pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06;
      for (const d of drift) {
        const st = starById[d.id], par = (d.z - 0.8) * 60;
        const x = st.x + d.ax * Math.sin(t * d.fx + d.px) - pointer.x * par, y = st.y + d.ay * Math.cos(t * d.fy + d.py) - pointer.y * par * 0.7;
        cur[d.id] = [x, y, d.z];
        planetXY[d.id] = [x, y];
        els.sys[d.id].g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${d.z})`);
      }
      for (const g of els.planet) {
        const ds = g.dataset, a = +ds.ph + t * +ds.sp, rx = +ds.rx, ry = +ds.ry, tl = (+ds.tilt * Math.PI) / 180;
        const lx = rx * Math.cos(a), ly = ry * Math.sin(a), depth = Math.sin(a);
        const x = lx * Math.cos(tl) - ly * Math.sin(tl), y = lx * Math.sin(tl) + ly * Math.cos(tl);
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.8 + 0.1 * (depth + 1)).toFixed(2)})`);
        g.style.setProperty('--d', (0.55 + 0.225 * (depth + 1)).toFixed(2));
        const sys = els.sys[ds.s], want = depth < 0 ? sys.back : sys.front;
        if (g.parentNode !== want && g !== document.activeElement) want.appendChild(g);
        const c = cur[ds.s];
        planetXY[ds.id] = [c[0] + c[2] * x, c[1] + c[2] * y];
      }
      for (const l of els.chain) {
        const p = planetXY[l.dataset.a], q = planetXY[l.dataset.b];
        l.setAttribute('x1', p[0].toFixed(1)); l.setAttribute('y1', p[1].toFixed(1)); l.setAttribute('x2', q[0].toFixed(1)); l.setAttribute('y2', q[1].toFixed(1));
      }
    }
    planetsStep = planetsStepImpl;
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { state.skyVisible = es[0].isIntersecting; }).observe(svg);

    const btn = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label; b.addEventListener('click', fn); return b; };
    const row = (title, items) => {
      const h = document.createElement('p'); h.className = 'row-h'; h.textContent = title;
      const r = document.createElement('div'); r.className = 'row'; items.forEach((i) => r.appendChild(i));
      panelX.append(h, r);
    };
    const link = (label, href, ext) => {
      const p = document.createElement('p'); const a = document.createElement('a');
      a.className = 'btn ghost'; a.href = href; a.textContent = label; if (ext) a.rel = 'noopener';
      p.appendChild(a); panelX.appendChild(p);
    };
    function paint(on) {
      const hs = on !== null;
      svg.classList.toggle('has-sel', hs);
      const set = (el, v) => el.classList.toggle('on', hs && !!v);
      els.star.forEach((g) => set(g, on && on.stars.has(g.dataset.id)));
      els.planet.forEach((g) => set(g, on && on.stars.has(g.dataset.s) && (on.keys === 'all' || on.keys.has(g.dataset.key))));
      els.orbit.forEach((o) => set(o, on && on.stars.has(o.dataset.s) && (on.keys === 'all' || on.keys.has(o.dataset.key))));
      els.chain.forEach((l) => set(l, on && (l.classList.contains('link')
        ? on.links && (on.stars.has(l.dataset.sa) || on.stars.has(l.dataset.sb))
        : on.keys !== 'all' && on.keys.has(l.dataset.key) && on.stars.has(l.dataset.sa) && on.stars.has(l.dataset.sb))));
    }
    function head(title, kind, text) {
      $$('.kind', panelH.parentNode).forEach((k) => k.remove());
      if (kind) { const k = document.createElement('p'); k.className = 'kind'; k.textContent = kind; panelH.before(k); }
      panelH.textContent = title; panelP.textContent = text; panelX.textContent = '';
    }
    const panel = $('#sky-panel');
    // Phones show one direction's column at a time; wider screens show all three.
    const narrow = matchMedia('(max-width: 700px)');
    const homeView = () => (narrow.matches ? D.views[current.col] : D.views.all);
    const current = { col: 'intelligence' };
    function select(type, id) {
      panel.hidden = type === 'all';
      $$('.sky-tools .chip[data-view]').forEach((b) => { const on = type === 'cluster' ? b.dataset.view === id : type === 'all' && b.dataset.view === 'all'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      if (type === 'all') {
        paint(null); goTo(homeView()); head('', '', '');
      } else if (type === 'cluster') {
        const c = D.clusters.find((x) => x.id === id), ss = D.stars.filter((s) => s.cluster === id);
        paint({ stars: new Set(ss.map((s) => s.id)), keys: 'all' });
        current.col = id;
        goTo(homeView()); head(c.label, '', c.question);
        row('Stars in this constellation', ss.map((s) => btn(s.short, () => select('star', s.id))));
      } else if (type === 'star') {
        const s = starById[id];
        const keys = [...new Set(els.planet.filter((g) => g.dataset.s === id).map((g) => g.dataset.key))];
        paint({ stars: new Set([id]), keys: new Set(keys), links: true });
        current.col = s.cluster;
        goTo(narrow.matches ? homeView() : around(s.x, s.y + 20, 700)); head(s.title, s.kind, s.description);
        link(s.label, s.href, s.external);
        if (keys.length) row('Orbiting this star', keys.map((k) => btn(bodyByKey[k].title, () => select('body', k))));
      } else if (type === 'body') {
        const b = bodyByKey[id];
        paint({ stars: new Set(b.stars), keys: new Set([id]) });
        goTo(homeView());
        const n = b.stars.length;
        head(b.title, b.kind === 'topic' ? 'Research topic' : 'Keyword', b.plain || `A keyword that appears in ${n} ${n === 1 ? 'project or paper' : 'projects and papers'} on this map. Its planets are chained across every star it circles.`);
        link(b.kind === 'topic' ? 'Read the research topic' : `Search publications for “${b.title}”`, b.href);
        row(`Circles ${n} ${n === 1 ? 'star' : 'stars'}`, b.stars.map((sid) => btn(starById[sid].short, () => select('star', sid))));
      }
    }
    $$('.sky-tools .chip[data-view]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.view === 'all') { select('all'); if (narrow.matches) goTo(D.views.all); } else select('cluster', b.dataset.view);
    }));

    const fit = () => { setVB(homeView()); $$('.sky-tools .chip[data-view]').forEach((b) => { const on = narrow.matches ? b.dataset.view === current.col : b.dataset.view === 'all'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); };
    narrow.addEventListener('change', fit);
    fit();
    const hit = (g) => (g.classList.contains('star') ? select('star', g.dataset.id) : select('body', g.dataset.key));
    svg.addEventListener('click', (e) => { const g = e.target.closest('.star,.planet'); if (g) hit(g); });
    svg.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('.star,.planet'); if (g) { e.preventDefault(); hit(g); } });
    planetsStepImpl(0);
  }

  /* ---- publications ---- */
  const list = $('#pub-list');
  if (list) {
    const q = $('#pub-q'), y = $('#pub-year'), tp = $('#pub-topic'), ty = $('#pub-type'), cnt = $('#pub-count'), empty = $('#pub-empty');
    const items = $$('.pub', list);
    const params = new URLSearchParams(location.search);
    q.value = params.get('q') || ''; y.value = params.get('year') || ''; tp.value = params.get('topic') || ''; ty.value = params.get('type') || '';
    function apply() {
      const term = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let n = 0;
      items.forEach((li) => {
        const ok = term.every((w) => li.dataset.text.includes(w)) && (!y.value || li.dataset.year === y.value) && (!tp.value || li.dataset.topics.split(' ').includes(tp.value)) && (!ty.value || li.dataset.type === ty.value);
        li.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = n === items.length ? `${n} publications` : `${n} of ${items.length} publications`;
      empty.hidden = n !== 0; list.hidden = n === 0;
      const p = new URLSearchParams();
      if (q.value.trim()) p.set('q', q.value.trim()); if (y.value) p.set('year', y.value); if (tp.value) p.set('topic', tp.value); if (ty.value) p.set('type', ty.value);
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    }
    const reset = () => { q.value = y.value = tp.value = ty.value = ''; apply(); q.focus(); };
    [q, y, tp, ty].forEach((el) => el.addEventListener('input', apply));
    $('#pub-reset').addEventListener('click', reset); $('#pub-empty-reset').addEventListener('click', reset);
    apply();
  }

  addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 150); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) draw(performance.now()); });
  size();
  requestAnimationFrame(frame);
})();
