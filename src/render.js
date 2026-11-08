// Çizim: dünya, varlıklar, ışın izlemeli fener ışığı ve karanlık katmanı.
(() => {
  const F = window.F, T = F.TILE, R = (c, x, y, w, h, r) => { c.fillStyle = r; c.fillRect(x, y, w, h); };

  class Cizici {
    constructor(cv) {
      this.cv = cv; this.c = cv.getContext('2d');
      this.kar = document.createElement('canvas'); this.kc = this.kar.getContext('2d');
      this.t = 0;
      this.damlalar = [];
      this.tozlar = Array.from({ length: 46 }, (_, i) => ({ x: Math.random() * 500, y: Math.random() * 300, s: 2 + Math.random() * 6, f: i }));
    }
    hazirla(L) { this.dunya = F.dunyaCiz(L); this.paralaks = F.paralaksCiz(); }
    boyut(g, w, h) {
      this.cv.width = w; this.cv.height = h;
      this.kar.width = Math.ceil(w / 2); this.kar.height = Math.ceil(h / 2);
      g.gorusW = w; g.gorusH = h; g.kamAnlik();
      this.c.imageSmoothingEnabled = false;
    }

    // Işın yürüyüşü ile görünürlük çokgeni: duvarın 7 px içine kadar aydınlatır.
    cokgen(g, x, y, r, n) {
      const L = g.L, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28319, dx = Math.cos(a), dy = Math.sin(a);
        let d = 0, icerde = 0;
        while (d < r) {
          d += 3;
          const v = L.tile(Math.floor((x + dx * d) / T), Math.floor((y + dy * d) / T));
          if (v === F.KAYA) { icerde += 3; if (icerde > 8) break; }
        }
        pts.push(x + dx * d, y + dy * d);
      }
      return pts;
    }

    isikKes(c, g, x, y, r, gol, guc) {
      const ox = this.ox, oy = this.oy;
      const sx = (x - ox) / 2, sy = (y - oy) / 2, sr = r / 2;
      const gr = c.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr);
      gr.addColorStop(0, `rgba(0,0,0,${guc})`); gr.addColorStop(0.45, `rgba(0,0,0,${guc * 0.82})`); gr.addColorStop(0.75, `rgba(0,0,0,${guc * 0.34})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr;
      c.beginPath();
      if (gol) {
        const p = this.cokgen(g, x, y, r, gol);
        for (let i = 0; i < p.length; i += 2) { const qx = (p[i] - ox) / 2, qy = (p[i + 1] - oy) / 2; i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); }
        c.closePath();
      } else c.arc(sx, sy, sr, 0, 6.2832);
      c.fill();
    }

    parilti(x, y, r, renk, a) {
      const c = this.c, sx = x - this.ox, sy = y - this.oy;
      const gr = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      gr.addColorStop(0, renk); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = a; c.fillStyle = gr; c.fillRect(sx - r, sy - r, r * 2, r * 2); c.globalAlpha = 1;
    }

    goster(g, x, y, m = 40) { return x > this.ox - m && x < this.ox + this.w + m && y > this.oy - m && y < this.oy + this.h + m; }

    ciz(g, alfa = 1, dtGercek = 1 / 60) {
      const c = this.c, L = g.L, S = F.S, p = g.p;
      this.t += dtGercek;
      const t = this.t;
      this.w = this.cv.width; this.h = this.cv.height;
      const kx = g.kam.ox + (g.kam.x - g.kam.ox) * alfa, ky = g.kam.oy + (g.kam.y - g.kam.oy) * alfa;
      const sx = g.sars > 0 ? (Math.random() - 0.5) * g.sars : 0, sy = g.sars > 0 ? (Math.random() - 0.5) * g.sars : 0;
      this.ox = Math.round(kx + sx); this.oy = Math.round(ky + sy);
      const ox = this.ox, oy = this.oy, w = this.w, h = this.h;
      c.imageSmoothingEnabled = false;

      // paralaks (yalnız arka duvarı olmayan yerlerde görünür)
      R(c, 0, 0, w, h, '#050409');
      if (this.paralaks) {
        const pw = 640, px = -(ox * 0.45 % pw), py = -(Math.max(0, oy - 40) * 0.4 % 512);
        for (let i = -1; i < 3; i++) for (let j = 0; j < 2; j++) c.drawImage(this.paralaks, px + i * pw, py + j * 512);
      }
      if (this.dunya) c.drawImage(this.dunya, ox, oy, w, h, 0, 0, w, h);

      c.save(); c.translate(-ox, -oy);
      this.varliklar(g, c, S, t);
      c.restore();

      this.karanlik(g, t);

      // yüzen yazılar ve ince toz
      for (const y of g.yazilar) { c.font = '8px monospace'; c.fillStyle = '#ffe9a0'; c.globalAlpha = Math.min(1, y.t * 3); c.fillText(y.s, Math.round(y.x - ox - 6), Math.round(y.y - oy)); c.globalAlpha = 1; }
      if (g.flash > 0) { c.globalAlpha = Math.min(0.7, g.flash); R(c, 0, 0, w, h, g.bitis > 0 ? '#fff4c8' : '#ffffff'); c.globalAlpha = 1; }
      if (g.bitis > 0) { c.globalAlpha = Math.min(1, g.bitis / 3); R(c, 0, 0, w, h, '#fff4c8'); c.globalAlpha = 1; }
      if (p.olu > 0.5) { c.globalAlpha = Math.min(1, (p.olu - 0.5) / 0.8); R(c, 0, 0, w, h, '#040208'); c.globalAlpha = 1; }
    }

    varliklar(g, c, S, t) {
      const L = g.L, p = g.p;
      // gün ışığı
      const gi = L.gunIsigi;
      if (this.goster(g, gi.x, gi.y + 120, 150)) {
        const gr = c.createLinearGradient(0, gi.y, 0, gi.y + 22 * T);
        gr.addColorStop(0, 'rgba(255,240,200,.32)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(gi.x - 22, gi.y); c.lineTo(gi.x + 42, gi.y); c.lineTo(gi.x + 100, gi.y + 22 * T); c.lineTo(gi.x - 44, gi.y + 22 * T); c.fill();
      }
      for (const m of L.isiklar) if (m.tur === 'mesale' && this.goster(g, m.x, m.y)) { c.save(); c.translate(m.x, m.y); S.mesale(c, t + m.x, m.renk); c.restore(); }
      else if (m.tur === 'kristal' && this.goster(g, m.x, m.y)) {
        R(c, m.x - 2, m.y - 6, 4, 12, m.renk); R(c, m.x - 4, m.y, 3, 7, m.renk); R(c, m.x + 2, m.y - 2, 3, 8, m.renk); R(c, m.x - 1, m.y - 5, 1, 7, '#fff');
      }
      for (const d of L.duraklar) if (this.goster(g, d.x, d.y)) { c.save(); c.translate(d.x, d.y); S.durak(c, d.id === g.durak, t + d.x); c.restore(); }

      for (const b of L.kopruler) for (let i = 0; i < Math.floor(b.ilerleme); i++) {
        const x = (b.x + i) * T, y = b.y * T;
        R(c, x, y, 16, 3, '#b8b4a4'); R(c, x, y + 3, 16, 7, '#6e6a60'); R(c, x + 15, y, 1, 10, '#3e3a34'); R(c, x + 3, y + 10, 10, 3, '#4c4840');
      }
      for (const k of L.kapilar) if (this.goster(g, k.x, k.y)) this.kapi(c, k, t);
      for (const pl of L.plakalar) if (this.goster(g, pl.x, pl.y)) {
        const u = pl.basili ? 2 : 0;
        R(c, pl.x + 2, pl.y + u, pl.w - 4, pl.h - u, pl.basili ? '#60fff0' : '#3a8c88');
        R(c, pl.x + 2, pl.y + u, pl.w - 4, 1, '#c8fff8');
      }
      for (const k of L.kollar) if (this.goster(g, k.x, k.y)) {
        if (k.anlikT > 0) { k.anlikT -= 1 / 60; if (k.anlikT <= 0) k.cekili = false; }
        c.save(); c.translate(k.x, k.y); S.kol(c, k.cekili, k.anlik); c.restore();
      }
      for (const s of L.sandiklar) if (this.goster(g, s.x, s.y)) { c.save(); c.translate(s.x, s.y); S.sandik(c, s.acik); c.restore(); }
      for (const b of L.bloklar) if (this.goster(g, b.x, b.y)) { c.save(); c.translate(Math.round(b.x), Math.round(b.y)); S.blok(c, b.w, b.h); c.restore(); }

      for (const o of L.ogeler) {
        if (g.alinan.has(o.id) || !this.goster(g, o.x, o.y)) continue;
        const sal = Math.round(Math.sin(t * 3 + o.id) * 1.5);
        c.save(); c.translate(o.x, o.y + sal);
        const I = S.ikon;
        if (o.tur === 'gem') {
          I.gem(c, o.renk);
          if ((t * 1.3 + o.id * 0.37) % 1 < 0.08) { R(c, -5, -6, 1, 3, '#fff'); R(c, -6, -5, 3, 1, '#fff'); }
        } else if (o.tur === 'hazine') I[o.ad](c);
        else if (o.tur === 'kalp') I.kalp(c);
        else if (o.tur === 'tilsim') I.tilsim(c);
        else if (o.tur === 'anahtar') I.anahtar(c, o.ad);
        else if (o.tur === 'cizme') I.cizme(c);
        else if (o.tur === 'emanet') I.emanet(c, t);
        c.restore();
      }

      for (const s of g.slimeler) if (this.goster(g, s.x, s.y)) {
        if (s.canli) { c.save(); c.translate(Math.round(s.x + 7), Math.round(s.y + s.h)); S.slime(c, s, t); c.restore(); }
        else if (s.olumT < 0.5) { R(c, s.x, s.y + s.h - 2, 14, 2, ['#3caa54', '#88b83a', '#a84aa8'][s.renk || 0]); }
      }
      for (const b of g.yarasalar) if (b.canli && this.goster(g, b.x, b.y)) {
        c.save(); c.translate(Math.round(b.x), Math.round(b.y)); if (b.x < b.sonX) c.scale(-1, 1); S.yarasa(c, b, t); c.restore();
      }

      const b = g.bekci;
      if (b.durum !== 'yok' && this.goster(g, b.x, b.y, 70)) {
        if (b.durum === 'uyku') { R(c, b.x - 8, b.y + 34, 50, 4, '#4a2c28'); }
        if (b.durum === 'isaret' || b.durum === 'dalis') { // yere düşecek gölge uyarısı
          const zy = L.bekci.zemin, gen = b.w + 8, a = 0.5 + Math.sin(t * 28) * 0.3;
          c.globalAlpha = a; R(c, b.x - 4, zy - 2, gen, 2, '#ff4020'); c.globalAlpha = 0.1 + a * 0.1; R(c, b.x + 4, b.y + b.h, b.w - 8, zy - b.y - b.h, '#ff5030'); c.globalAlpha = 1;
        }
        c.save();
        const titre = b.durum === 'isaret' || b.durum === 'olum' ? (Math.random() - 0.5) * 3 : 0;
        c.translate(Math.round(b.x + b.w / 2 + titre), Math.round(b.y + b.h));
        S.bekci(c, b, t);
        c.restore();
      }
      for (const m of g.mermiler) {
        if (m.tur === 'dalga') {
          for (let i = 0; i < 3; i++) R(c, m.x + i * 3, m.y + i * 4 + (Math.sin(t * 40 + i) * 1), 10 - i * 3, 14 - i * 4, ['#ffd060', '#ff8030', '#c03010'][2 - i]);
        } else { R(c, m.x, m.y, m.w, m.h, '#70646c'); R(c, m.x, m.y, m.w, 2, '#a89aa0'); R(c, m.x + 8, m.y, 3, m.h, '#4c4450'); }
      }

      // oyuncu
      if (!(p.inv > 0 && p.olu <= 0 && Math.floor(t * 18) % 2)) {
        c.save();
        c.translate(Math.round(p.x + 5), Math.round(p.y + p.h));
        c.scale(p.yon, 1);
        if (p.olu > 0) c.rotate(Math.min(1.5, p.olu * 3));
        let d = 'dur';
        if (p.itiyor) d = 'it'; else if (!p.zemin) d = p.vy < 0 ? 'zipla' : 'dus'; else if (Math.abs(p.vx) > 15) d = 'kos';
        S.oyuncu(c, { durum: d, t: d === 'kos' || d === 'it' ? p.animT + (d === 'it' ? t : 0) : t, cizme: g.env.cizme, fenerX: Math.sin(t * 2.5) * 0.6 - p.vx / 90 });
        c.restore();
      }
      if (g.kalkan > 0) { // tılsım halesi
        c.strokeStyle = 'rgba(140,215,255,.45)'; c.lineWidth = 1;
        c.beginPath(); c.arc(Math.round(p.x + 5), Math.round(p.y + 8), 14 + Math.sin(t * 4), t, t + 1.6 + g.kalkan * 1.4); c.stroke();
      }

      // sahte duvar: oyuncu içeri girince solar
      const icerde = p.x < 30 * T && p.y > 47 * T && p.y < 56 * T;
      this.sahteA = Math.max(0, Math.min(1, (this.sahteA ?? 1) + (icerde ? -0.07 : 0.07)));
      if (this.sahteA > 0 && this.dunya) {
        c.globalAlpha = this.sahteA;
        for (const s of L.sahte) c.drawImage(this.dunya, (s.x + 2) * T, 54 * T, 16, 16, s.x * T, s.y * T, 16, 16);
        c.globalAlpha = 1;
      }

      for (const q of g.parca) {
        c.globalAlpha = Math.min(1, (1 - q.t / q.omur) * 1.6);
        R(c, Math.round(q.x), Math.round(q.y), q.boy, q.boy, q.renk);
      }
      c.globalAlpha = 1;
    }

    kapi(c, k, t) {
      const h = k.h * (1 - k.acik);
      if (h <= 0) return;
      c.save(); c.beginPath(); c.rect(k.x - 1, k.y, k.w + 2, k.h); c.clip();
      const y = k.y - k.h * k.acik;
      if (k.tur === 'bronz' || k.tur === 'gumus') {
        const p = k.tur === 'bronz' ? ['#a8682c', '#e8a860', '#5c3412'] : ['#98a4b4', '#f0f4fa', '#4e5866'];
        R(c, k.x, y, k.w, k.h, p[0]); R(c, k.x, y, 2, k.h, p[1]); R(c, k.x + k.w - 2, y, 2, k.h, p[2]);
        for (let i = 6; i < k.h; i += 14) R(c, k.x, y + i, k.w, 2, p[2]);
        R(c, k.x + 3, y + k.h / 2 - 6, 10, 12, p[1]); R(c, k.x + 6, y + k.h / 2 - 3, 4, 4, '#100c10'); R(c, k.x + 7, y + k.h / 2, 2, 4, '#100c10');
      } else if (k.tur === 'kol' || k.tur === 'plaka' || k.tur === 'muhur') {
        const m = k.tur === 'kol' ? '#7c7a84' : k.tur === 'plaka' ? '#5aa8a4' : '#b04030';
        R(c, k.x + 1, y, 14, k.h, 'rgba(10,8,14,.6)');
        for (let i = 2; i < k.w; i += 4) R(c, k.x + i, y, 2, k.h, m);
        for (let i = 6; i < k.h; i += 12) R(c, k.x, y + i, k.w, 2, m);
        for (let i = 2; i < k.w; i += 4) R(c, k.x + i, y + k.h - 3, 2, 3, '#d8d4dc');
      } else {
        R(c, k.x, y, k.w, k.h, '#6a3a30'); R(c, k.x, y, 2, k.h, '#a8604c');
        for (let i = 0; i < 4; i++) R(c, k.x + 4, y + 8 + i * 15, 8, 6, '#ff6a30');
      }
      c.restore();
    }

    karanlik(g, t) {
      const c = this.c, kc = this.kc, L = g.L, p = g.p, w = this.w, h = this.h;
      const kw = this.kar.width, kh = this.kar.height;
      kc.globalCompositeOperation = 'source-over';
      const kasa = g.bolgeId === 'kasa';
      kc.clearRect(0, 0, kw, kh);
      kc.fillStyle = kasa ? 'rgba(14,8,2,.58)' : 'rgba(5,4,12,.965)';
      kc.fillRect(0, 0, kw, kh);
      kc.globalCompositeOperation = 'destination-out';
      const tit = 1 + Math.sin(t * 9) * 0.018 + Math.sin(t * 23.3) * 0.012;
      const fx = p.x + 5 + p.yon * 7, fy = p.y + 11;
      const faz = p.olu > 0 ? Math.max(0, 1 - p.olu) : 1;
      this.isikKes(kc, g, fx, fy, 142 * tit * faz + 1, 200, 1);
      this.isikKes(kc, g, fx, fy, 38 * tit, 0, 0.72);
      const gun = L.gunIsigi;
      if (this.goster(g, gun.x, gun.y + 100, 180)) {
        for (let i = 0; i < 5; i++) this.isikKes(kc, g, gun.x + 8 + i * 12, gun.y + 40 + i * 62, 80 + i * 8, 0, 0.8);
      }
      const isikli = [];
      for (const m of L.isiklar) if (this.goster(g, m.x, m.y, m.r)) {
        const f = m.tur === 'mesale' ? 1 + Math.sin(t * 8 + m.x) * 0.05 + Math.sin(t * 17 + m.y) * 0.03 : 1;
        this.isikKes(kc, g, m.x, m.y - 3, m.r * f, 90, 0.95);
        isikli.push([m.x, m.y, m.r * f, m.renk, 0.3]);
      }
      for (const d of L.duraklar) if (d.id === g.durak && this.goster(g, d.x, d.y, 80)) { this.isikKes(kc, g, d.x, d.y - 16, 70, 60, 0.9); isikli.push([d.x, d.y - 16, 70, '#ffa040', 0.3]); }
      for (const o of L.ogeler) {
        if (g.alinan.has(o.id) || !this.goster(g, o.x, o.y, 30)) continue;
        const r = o.tur === 'gem' ? 16 : 34;
        this.isikKes(kc, g, o.x, o.y, r, 0, 0.6);
        const rn = o.tur === 'gem' ? ['#50d0ff', '#ff5078', '#50ff90', '#ffd050'][o.renk] : o.tur === 'anahtar' ? (o.ad === 'bronz' ? '#ffa050' : '#d0e8ff') : o.tur === 'tilsim' ? '#60b0ff' : '#ffd070';
        isikli.push([o.x, o.y, r * (o.tur === 'gem' ? 1 : 1.3), rn, o.tur === 'gem' ? 0.4 : 0.5]);
      }
      if (g.bekci.durum !== 'yok' && g.bekci.durum !== 'uyku' && this.goster(g, g.bekci.x, g.bekci.y, 60)) {
        this.isikKes(kc, g, g.bekci.x + 17, g.bekci.y + 10, 90, 0, 0.75);
        isikli.push([g.bekci.x + 17, g.bekci.y + 6, 52, g.bekci.durum === 'isaret' ? '#ffffff' : '#ff4020', 0.4]);
      }
      for (const m of g.mermiler) if (m.tur === 'dalga') { this.isikKes(kc, g, m.x + 5, m.y + 6, 40, 0, 0.8); isikli.push([m.x + 5, m.y + 6, 26, '#ff7030', 0.6]); }
      for (const q of L.plakalar) if (q.basili) isikli.push([q.x + q.w / 2, q.y, 40, '#40ffe0', 0.4]);

      c.imageSmoothingEnabled = true;
      c.drawImage(this.kar, 0, 0, w, h);
      c.imageSmoothingEnabled = false;

      c.globalCompositeOperation = 'lighter';
      this.parilti(fx, fy, 112 * tit * faz + 1, '#ffb464', 0.2);
      this.parilti(fx, fy, 20 * tit, '#ffe6a0', 0.6);
      for (const [x, y, r, rn, a] of isikli) this.parilti(x, y, r, rn, a);
      if (g.env.cizme && p.cift > 0) this.parilti(p.x + 5, p.y + 18, 28, '#a0e0ff', p.cift * 2);
      // havada süzülen toz: yalnız fener çevresinde parlar
      for (const q of this.tozlar) {
        const qx = ((q.x + Math.sin(t * 0.3 + q.f) * 22 - this.ox * 0.9) % w + w) % w;
        const qy = ((q.y + t * q.s - this.oy * 0.9) % h + h) % h;
        const d = Math.hypot(qx + this.ox - fx, qy + this.oy - fy);
        if (d < 110) { c.globalAlpha = (1 - d / 110) * 0.5; R(c, qx, qy, 1, 1, '#ffdca0'); }
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      // köşe kararması
      const v = c.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, w * 0.66);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
      c.fillStyle = v; c.fillRect(0, 0, w, h);
    }

    // M tuşu haritası
    harita(g, cv) {
      const L = g.L, c = cv.getContext('2d'), o = 4;
      cv.width = L.W * o; cv.height = L.H * o;
      c.clearRect(0, 0, cv.width, cv.height);
      const gw = Math.ceil(L.W / 4);
      for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
        if (!g.gezilen[(x >> 2) + (y >> 2) * gw]) continue;
        const v = L.tile(x, y);
        if (v === F.KAYA) {
          if (L.tile(x, y - 1) !== F.KAYA || L.tile(x, y + 1) !== F.KAYA || L.tile(x - 1, y) !== F.KAYA || L.tile(x + 1, y) !== F.KAYA) { c.fillStyle = F.PAL[L.bolge(x * T, y * T).pal].kenar; c.fillRect(x * o, y * o, o, o); }
        } else { c.fillStyle = v === F.DIKEN ? '#c04040' : 'rgba(255,240,210,.12)'; c.fillRect(x * o, y * o, o, o); }
      }
      for (const k of L.kapilar) if (!k.acilis && g.gezilen[((k.x / T) >> 2) + ((k.y / T) >> 2) * gw]) {
        c.fillStyle = k.tur === 'bronz' ? '#e09a50' : k.tur === 'gumus' ? '#e0ecff' : '#a0a0b0';
        c.fillRect(k.x / T * o - 2, k.y / T * o, 7, k.h / T * o);
      }
      for (const d of L.duraklar) if (g.gezilen[((d.x / T) >> 2) + (((d.y - 8) / T) >> 2) * gw]) { c.fillStyle = '#ff9a40'; c.fillRect(d.x / T * o - 3, d.y / T * o - 8, 6, 6); }
      c.fillStyle = '#ffffff'; c.fillRect(g.p.x / T * o - 4, g.p.y / T * o - 3, 8, 8);
    }
  }
  F.Cizici = Cizici;
})();
