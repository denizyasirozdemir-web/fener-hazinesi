// Prosedürel görseller: dünya katmanı ve piksel sprite'lar. Hiç dış dosya yok.
(() => {
  const F = window.F, T = F.TILE;
  const rng = s => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  F.rng = rng;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const kar = (a, b, u) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * u)).join(',')})`; };
  const koyu = (c, u) => kar(c, '#05040a', u);
  const acik = (c, u) => kar(c, '#fff4dc', u);
  const R = (c, x, y, w, h, r) => { c.fillStyle = r; c.fillRect(x, y, w, h); };

  // Dünya: tek büyük tuval
  F.dunyaCiz = function (L) {
    const cv = document.createElement('canvas');
    cv.width = L.W * T; cv.height = L.H * T;
    const c = cv.getContext('2d');
    const kati = (x, y) => { const v = L.tile(x, y); return v === F.KAYA; };
    const sahte = new Set(L.sahte.map(s => s.x + ',' + s.y));
    const tl = (x, y) => kati(x, y) || sahte.has(x + ',' + y);
    const r = rng(1234);

    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
      const px = x * T, py = y * T;
      const b = L.bolge(px, py), pal = F.PAL[b.pal];
      const v = L.tile(x, y);
      if (!tl(x, y)) {
        if (b.acik) continue; // Büyük Salon arkası paralaksa açık
        // arka duvar tuğlaları
        for (let j = 0; j < 2; j++) {
          const ofs = (j + y) % 2 ? 8 : 0;
          const ton = 0.0 + r() * 0.3;
          for (let i = -1; i < 2; i++) {
            const bx = px + i * 16 + ofs;
            R(c, Math.max(px, bx), py + j * 8, Math.min(px + 16, bx + 15) - Math.max(px, bx), 7, koyu(pal.arka, ton));
          }
        }
        if (r() < 0.06) R(c, px + r() * 12, py + r() * 12, 3, 2, koyu(pal.arka, 0.55));
      }
    }

    // Kaya karoları
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
      if (!tl(x, y)) continue;
      const px = x * T, py = y * T;
      const pal = F.PAL[L.bolge(px, py).pal];
      // havaya uzaklık
      let d = 9;
      for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (!tl(x + i, y + j)) d = Math.min(d, Math.max(Math.abs(i), Math.abs(j)));
      if (d > 4) { R(c, px, py, 16, 16, '#050409'); continue; }
      const sonum = [0, 0, 0.3, 0.6, 0.85][d] ?? 0.9;
      for (let j = 0; j < 2; j++) {
        const ofs = (j + y) % 2 ? 8 : 0;
        for (let i = -1; i < 2; i++) {
          const bx = px + i * 16 + ofs, x0 = Math.max(px, bx), x1 = Math.min(px + 16, bx + 15);
          if (x1 <= x0) continue;
          const taban = koyu(pal.tas, sonum + r() * 0.16);
          R(c, x0, py + j * 8, x1 - x0, 8, koyu(pal.tas, Math.min(1, sonum + 0.52)));
          R(c, x0, py + j * 8, x1 - x0, 7, taban);
          R(c, x0, py + j * 8, x1 - x0, 1, koyu(pal.kenar, sonum + 0.3));
        }
      }
      if (r() < 0.25 && d <= 2) R(c, px + r() * 13, py + r() * 13, 2, 1, koyu(pal.tas, 0.62));
      // açıkta kalan yüzeyler
      if (!tl(x, y - 1)) {
        R(c, px, py, 16, 3, pal.kenar); R(c, px, py + 3, 16, 1, koyu(pal.kenar, 0.45));
        for (let i = 0; i < 16; i += 2) if (r() < 0.45) R(c, px + i, py + 1, 2, 1, acik(pal.kenar, 0.2));
        if (r() < 0.5) { const m = 3 + r() * 8; R(c, px + r() * 8, py, m, 2, pal.yosun); if (r() < 0.6) R(c, px + r() * 12, py + 2, 2, 2 + r() * 4, pal.yosun); }
      }
      if (!tl(x, y + 1)) { R(c, px, py + 14, 16, 2, koyu(pal.tas, 0.75)); if (r() < 0.2) R(c, px + r() * 13, py + 16, 1, 3 + r() * 5, koyu(pal.tas, 0.55)); }
      if (!tl(x - 1, y)) R(c, px, py, 2, 16, koyu(pal.kenar, 0.2));
      if (!tl(x + 1, y)) R(c, px + 14, py, 2, 16, koyu(pal.tas, 0.6));
    }

    // Tek yönlü taş raflar ve dikenler
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
      const v = L.tile(x, y), px = x * T, py = y * T;
      const pal = F.PAL[L.bolge(px, py).pal];
      if (v === F.TEK) {
        R(c, px, py, 16, 2, pal.kenar); R(c, px, py + 2, 16, 3, pal.tas); R(c, px, py + 5, 16, 1, koyu(pal.tas, 0.6));
        if (x % 3 === 0) R(c, px, py + 2, 1, 3, koyu(pal.tas, 0.5));
        if (L.tile(x - 1, y) !== F.TEK) { R(c, px, py + 5, 4, 3, koyu(pal.tas, 0.3)); R(c, px, py + 8, 2, 2, koyu(pal.tas, 0.5)); }
        if (L.tile(x + 1, y) !== F.TEK) { R(c, px + 12, py + 5, 4, 3, koyu(pal.tas, 0.3)); R(c, px + 14, py + 8, 2, 2, koyu(pal.tas, 0.5)); }
      } else if (v === F.DIKEN) {
        for (let i = 0; i < 2; i++) {
          const sx = px + 1 + i * 7;
          for (let k = 0; k < 7; k++) {
            R(c, sx + 3 - (k >> 1), py + 8 + k, 1 + (k >> 1) * 2 + 1, 1, k < 2 ? '#e6e6f0' : kar('#a8a8bc', '#4a4a60', k / 7));
          }
        }
        R(c, px, py + 15, 16, 1, '#2a2a36');
      }
    }

    // Süslemeler: sütun, kemer, zincir, flama, kök
    const dr = rng(77);
    for (let y = 2; y < L.H - 2; y++) for (let x = 2; x < L.W - 2; x++) {
      if (tl(x, y) || L.tile(x, y) !== F.BOS) continue;
      const px = x * T, py = y * T;
      const b = L.bolge(px, py), pal = F.PAL[b.pal];
      if (tl(x, y - 1) && dr() < 0.09) { // tavandan zincir / kök
        const n = 2 + Math.floor(dr() * 5);
        const kok = dr() < 0.5;
        for (let i = 0; i < n * 8; i += kok ? 1 : 4) {
          if (tl(x, y + Math.floor(i / 16))) break;
          if (kok) R(c, px + 8 + Math.sin(i * 0.3) * 2, py + i, 1, 1, koyu(pal.yosun, 0.35));
          else { R(c, px + 8, py + i, 2, 3, '#55525a'); R(c, px + 8, py + i, 1, 1, '#8a8690'); }
        }
      }
      if (tl(x, y + 1) && dr() < 0.05 && !b.acik) { // yerde kafatası / moloz
        R(c, px + 3, py + 12, 7, 4, '#6e6658'); R(c, px + 4, py + 11, 5, 1, '#8c8474'); R(c, px + 11, py + 14, 3, 2, '#5a5448');
      }
      if (x % 13 === 0 && y % 8 === 3 && !b.acik && !tl(x, y + 1) && !tl(x + 1, y) && !tl(x - 1, y)) { // nişler
        const a = koyu(pal.arka, 0.65);
        R(c, px + 2, py, 12, 16, a); R(c, px + 4, py - 3, 8, 3, a);
        R(c, px + 1, py + 16, 14, 2, koyu(pal.tas, 0.35));
      }
    }
    // Duraklar arası flamalar
    const flama = (x, y, renk) => {
      const px = x * T, py = y * T;
      R(c, px - 1, py - 1, 18, 2, '#6a5030');
      for (let i = 0; i < 26; i++) R(c, px + Math.min(i >> 2, 3), py + i, 16 - Math.min(i >> 2, 3) * 2, 1, koyu(renk, (i % 7 === 0 ? 0.45 : 0.15)));
      R(c, px + 6, py + 8, 4, 4, '#d8b050');
    };
    [[66, 18, '#7a2c34'], [90, 8, '#2c4a7a'], [100, 8, '#2c4a7a'], [128, 20, '#6a2c7a'], [150, 20, '#6a2c7a'], [130, 4, '#8a2020'], [150, 4, '#8a2020'], [196, 16, '#506a8a'], [188, 3, '#b08820'], [198, 3, '#b08820']].forEach(a => flama(...a));

    // Gizli hazine odası: altın yığınları
    const ar = rng(9);
    for (let i = 0; i < 520; i++) {
      const x = 182 * T + ar() * 22 * T, u = Math.abs((x / T - 193) / 11);
      const h = (1 - u) * 26 * ar();
      const y = 14 * T - h;
      R(c, x, y, 3, 2, ['#e8c048', '#ffe28a', '#b08820', '#f4d060'][Math.floor(ar() * 4)]);
    }
    // Emanet kaidesi
    R(c, 191 * T, 13 * T + 4, 48, 12, '#a88a4c'); R(c, 191 * T, 13 * T + 4, 48, 2, '#ffe08a');
    return cv;
  };

  // Büyük Salon arkası: uzaktaki sütunlar ve kemerler
  F.paralaksCiz = function () {
    const cv = document.createElement('canvas');
    cv.width = 640; cv.height = 512;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0a0c18'); g.addColorStop(0.6, '#141a2c'); g.addColorStop(1, '#0c0e1a');
    c.fillStyle = g; c.fillRect(0, 0, 640, 512);
    const r = rng(5);
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 160;
      R(c, x, 0, 44, 512, '#1a2034'); R(c, x + 4, 0, 6, 512, '#242c44'); R(c, x + 36, 0, 8, 512, '#121626');
      for (let y = 30; y < 512; y += 58) R(c, x - 3, y, 50, 4, '#20283e');
      c.strokeStyle = '#181e30'; c.lineWidth = 16;
      c.beginPath(); c.arc(x + 102, 280, 58, Math.PI, 0); c.stroke();
    }
    for (let i = 0; i < 90; i++) R(c, r() * 640, r() * 512, 2, 1, '#0d1020');
    return cv;
  };

  // ----- Sprite'lar (ayak noktası 0,0; sağa bakar) -----
  const S = {};
  S.oyuncu = function (c, d) {
    // d: {durum:'dur|kos|zipla|dus|it', t, cizme, fenerX}
    const kos = d.durum === 'kos', it = d.durum === 'it', hava = d.durum === 'zipla' || d.durum === 'dus';
    const ad = Math.sin(d.t * 6.283);
    const nefes = !kos && !hava && !it ? (Math.sin(d.t * 0.6) > 0 ? 0 : 1) : 0;
    const bob = kos ? (Math.abs(ad) > 0.6 ? -1 : 0) : 0;
    const ak = it ? -1 : 0; // öne eğilme
    const bot = d.cizme ? '#9fd8f0' : '#4a2e1c', pant = '#3e3a52', mont = '#a8652e', montK = '#7c4620', ten = '#e8b48c', sap = '#6e4422', sapK = '#4c2e16';
    // arkadaki bacak
    const b1 = kos ? Math.round(ad * 3) : hava ? (d.durum === 'zipla' ? -2 : 2) : it ? -3 : -1;
    const b2 = kos ? -Math.round(ad * 3) : hava ? (d.durum === 'zipla' ? 3 : -1) : it ? 2 : 2;
    const k1 = kos && ad > 0 ? 1 : 0, k2 = kos && ad < 0 ? 1 : 0;
    R(c, -2 + b1, -5 - k1 + bob, 3, 4, '#2c2a3e'); R(c, -2 + b1, -2 - k1, 4, 2, koyu(bot, 0.25));
    R(c, -1 + b2, -5 - k2 + bob, 3, 4, pant); R(c, -1 + b2, -2 - k2, 4, 2, bot);
    if (d.cizme) { R(c, -3 + b2, -4 - k2, 2, 1, '#ffffff'); R(c, -4 + b2, -3 - k2, 2, 1, '#d8f0ff'); }
    const y0 = bob + nefes;
    // gövde
    R(c, -3 + ak, -12 + y0, 6, 7, mont); R(c, -3 + ak, -12 + y0, 2, 7, montK); R(c, 1 + ak, -11 + y0, 2, 5, '#dcc494');
    R(c, -3 + ak, -6 + y0, 6, 1, '#3c2412'); R(c, 0 + ak, -6 + y0, 1, 1, '#e0b84c');
    // atkı
    const dal = Math.round(Math.sin(d.t * 4) * 1);
    const rz = kos || hava ? 1 : 0;
    R(c, -3 + ak, -13 + y0, 6, 2, '#b02e30'); R(c, -6 + ak, -13 + y0 + dal * rz, 3, 2, '#b02e30'); if (rz) R(c, -9 + ak, -12 + y0 - dal, 3, 1, '#8a2024');
    // baş
    R(c, -2 + ak, -18 + y0, 5, 5, ten); R(c, 2 + ak, -16 + y0, 1, 1, '#2a1a10'); R(c, -2 + ak, -14 + y0, 2, 1, '#6a4426');
    // şapka
    R(c, -5 + ak, -18 + y0, 11, 1, sapK); R(c, -3 + ak, -21 + y0, 7, 3, sap); R(c, -3 + ak, -19 + y0, 7, 1, '#2e1c0c'); R(c, -1 + ak, -22 + y0, 3, 1, sap);
    // fenerli kol
    if (it) { R(c, 2 + ak, -11 + y0, 5, 2, montK); R(c, 7 + ak, -11 + y0, 1, 2, ten); }
    else {
      const k = kos ? Math.round(ad * 1) : 0;
      R(c, 2 + ak, -11 + y0, 2, 4, montK); R(c, 3 + ak, -8 + y0, 3, 1, montK); R(c, 5 + ak, -8 + y0, 1, 1, ten);
      const fx = 7 + ak + Math.round(d.fenerX), fy = -6 + y0 + k;
      R(c, fx - 1, fy - 3, 3, 1, '#8a6a34'); R(c, fx - 2, fy - 2, 5, 1, '#5a4620');
      R(c, fx - 2, fy - 1, 5, 4, '#ffcf60'); R(c, fx - 1, fy, 3, 2, '#fff6c8'); R(c, fx - 2, fy + 3, 5, 1, '#5a4620');
    }
  };

  S.slime = function (c, s, t) {
    const f = Math.sin(s.faz || t * 5);
    const g = 15 + Math.round(f * 1.3), h = 11 - Math.round(f * 1.2);
    const pal = [['#3caa54', '#6ee07e', '#1e6a34'], ['#88b83a', '#c4e86a', '#4e7a1e'], ['#a84aa8', '#e088d8', '#6a2470']][s.renk || 0];
    const x = -Math.floor(g / 2);
    R(c, x + 2, -h, g - 4, 1, pal[1]);
    R(c, x + 1, -h + 1, g - 2, 2, pal[0]);
    R(c, x, -h + 3, g, h - 4, pal[0]);
    R(c, x + 1, -2, g - 2, 2, pal[2]); R(c, x, -3, 2, 1, pal[2]); R(c, x + g - 2, -3, 2, 1, pal[2]);
    R(c, x + 3, -h + 1, 3, 1, '#ffffff');
    const yn = s.vx > 0 ? 2 : -2;
    R(c, -3 + yn, -h + 4, 3, 3, '#fff'); R(c, 2 + yn, -h + 4, 3, 3, '#fff');
    R(c, -2 + yn + (yn > 0 ? 1 : -1) + 0, -h + 5, 2, 2, '#101018'); R(c, 3 + yn + (yn > 0 ? 0 : -1), -h + 5, 2, 2, '#101018');
    R(c, -1 + yn, -h + 8 > -2 ? -3 : -h + 8, 3, 1, pal[2]);
  };

  S.yarasa = function (c, b, t) {
    const ana = '#4a3a58', kn = '#2c2238', z = '#6e5a7e';
    if (b.durum === 'asili') {
      R(c, -3, -4, 6, 8, ana); R(c, -4, -3, 1, 6, kn); R(c, 3, -3, 1, 6, kn); R(c, -2, 2, 1, 1, '#ff5040'); R(c, 1, 2, 1, 1, '#ff5040');
      R(c, -2, -5, 1, 1, z); R(c, 1, -5, 1, 1, z);
      return;
    }
    const k = Math.sin(t * 22) > 0;
    R(c, -3, -3, 6, 6, ana); R(c, -3, -5, 1, 2, ana); R(c, 2, -5, 1, 2, ana);
    R(c, -2, -1, 1, 1, '#ff5040'); R(c, 1, -1, 1, 1, '#ff5040'); R(c, -1, 1, 2, 1, '#e8e0d0');
    if (k) { R(c, -10, -5, 7, 2, kn); R(c, 3, -5, 7, 2, kn); R(c, -12, -3, 3, 2, kn); R(c, 9, -3, 3, 2, kn); R(c, -8, -3, 5, 1, z); R(c, 3, -3, 5, 1, z); }
    else { R(c, -9, 0, 6, 2, kn); R(c, 3, 0, 6, 2, kn); R(c, -12, 2, 4, 2, kn); R(c, 8, 2, 4, 2, kn); R(c, -8, -1, 5, 1, z); R(c, 3, -1, 5, 1, z); }
  };

  // Bekçi: taş kanatlı dev. Orta alt noktası 0,0; yükseklik ~38.
  S.bekci = function (c, b, t) {
    const uyku = b.durum === 'uyku', sersem = b.durum === 'saplanma';
    const hasarli = 4 - b.can;
    const ana = b.parla > 0.3 ? '#fff0d8' : '#6e6470', ack = b.parla > 0.3 ? '#ffffff' : '#94889a', kyu = '#443c4c', goz = uyku ? '#3a3440' : b.durum === 'isaret' ? '#ffffff' : '#ff4a20';
    const k = uyku || sersem ? -2 : Math.round(Math.sin(b.kanat) * 6);
    // kanatlar
    for (const yn of [-1, 1]) {
      c.save(); c.scale(yn, 1);
      R(c, 13, -30 + k, 8, 6, kyu); R(c, 21, -33 + k * 1.4, 8, 6, kyu); R(c, 28, -35 + k * 1.8, 7, 5, kyu);
      R(c, 14, -24 + k, 5, 10, '#39323f'); R(c, 21, -27 + k * 1.3, 5, 10, '#39323f'); R(c, 28, -30 + k * 1.7, 4, 9, '#39323f');
      R(c, 13, -30 + k, 8, 1, ana); R(c, 21, -33 + k * 1.4, 8, 1, ana);
      c.restore();
    }
    // bacak + pençe
    R(c, -13, -10, 9, 8, kyu); R(c, 4, -10, 9, 8, kyu); R(c, -15, -3, 13, 3, ana); R(c, 2, -3, 13, 3, ana);
    for (const x of [-15, -10, -5, 2, 7, 12]) R(c, x, -1, 2, 1, '#d8d0c0');
    // gövde
    R(c, -13, -26, 26, 17, ana); R(c, -13, -26, 26, 2, ack); R(c, -13, -11, 26, 2, kyu); R(c, -9, -21, 18, 9, kyu); R(c, -7, -19, 14, 5, ana);
    R(c, -2, -18, 4, 4, b.durum === 'yok' ? '#333' : '#ff7030');
    // kollar
    R(c, -18, -25, 6, 13, ana); R(c, 12, -25, 6, 13, ana); R(c, -19, -13, 7, 4, kyu); R(c, 12, -13, 7, 4, kyu);
    // baş
    const by = sersem ? -32 + Math.round(Math.sin(t * 12)) : -36;
    R(c, -8, by, 16, 10, ana); R(c, -8, by, 16, 2, ack); R(c, -5, by + 7, 10, 3, kyu);
    R(c, -11, by - 2, 3, 6, kyu); R(c, 8, by - 2, 3, 6, kyu); R(c, -13, by - 5, 3, 4, ack); R(c, 10, by - 5, 3, 4, ack);
    R(c, -6, by + 3, 4, 2, goz); R(c, 2, by + 3, 4, 2, goz);
    for (const x of [-4, -1, 2]) R(c, x, by + 8, 2, 1, '#e8e0d0');
    // çatlaklar
    if (hasarli > 0) { R(c, -11, -24, 2, 7, '#201c24'); R(c, -9, -18, 3, 1, '#201c24'); }
    if (hasarli > 1) { R(c, 7, -24, 1, 9, '#ff7030'); R(c, 4, -16, 4, 1, '#ff7030'); R(c, 3, by + 1, 1, 3, '#201c24'); }
    if (hasarli > 2) { R(c, -5, by, 1, 4, '#ff7030'); R(c, -12, -14, 8, 1, '#ff7030'); }
    if (sersem) { // sersemleme yıldızları: kafa hedefi
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.09;
        R(c, Math.round(Math.cos(a) * 14) - 1, by - 8 + Math.round(Math.sin(a) * 3), 3, 3, '#ffe060');
      }
    }
  };

  const ikon = {
    gem(c, renk = 0) {
      const p = [['#3cc4f0', '#a8f0ff', '#1c74b0'], ['#f04868', '#ffb0c0', '#a01c3c'], ['#3cd878', '#b0ffc8', '#148048'], ['#ffc830', '#fff0a0', '#b87c10']][renk];
      R(c, -3, -5, 7, 1, p[1]); R(c, -4, -4, 9, 2, p[0]); R(c, -3, -4, 2, 2, p[1]);
      R(c, -3, -2, 7, 2, p[0]); R(c, -2, 0, 5, 2, p[2]); R(c, -1, 2, 3, 1, p[2]); R(c, 0, 3, 1, 1, p[2]);
    },
    anahtar(c, ad) {
      const p = ad === 'bronz' ? ['#d08a44', '#ffc888', '#7c4a1c'] : ['#c0ccdc', '#ffffff', '#6c7a90'];
      R(c, -7, -4, 7, 7, p[0]); R(c, -5, -2, 3, 3, '#0c0a10'); R(c, -6, -4, 4, 1, p[1]);
      R(c, 0, -1, 8, 2, p[0]); R(c, 0, -1, 8, 1, p[1]); R(c, 5, 1, 2, 3, p[2]); R(c, 2, 1, 2, 2, p[2]);
    },
    tilsim(c) {
      R(c, -1, -7, 3, 2, '#d8c070'); R(c, -3, -5, 7, 1, '#8fd8ff');
      R(c, -5, -4, 11, 6, '#3f9ae0'); R(c, -4, -4, 3, 2, '#c0ecff'); R(c, -3, 2, 7, 2, '#2c70b8'); R(c, -1, 4, 3, 1, '#2c70b8');
      R(c, -1, -2, 3, 3, '#ffffff');
    },
    kalp(c) {
      R(c, -5, -4, 4, 2, '#ff5070'); R(c, 2, -4, 4, 2, '#ff5070'); R(c, -6, -3, 13, 3, '#ff5070'); R(c, -5, 0, 11, 2, '#e03058'); R(c, -3, 2, 7, 1, '#c02048'); R(c, -1, 3, 3, 1, '#c02048'); R(c, 0, 4, 1, 1, '#c02048');
      R(c, -4, -3, 2, 1, '#ffc0d0');
    },
    kalpBos(c) { R(c, -5, -4, 4, 2, '#3a2a34'); R(c, 2, -4, 4, 2, '#3a2a34'); R(c, -6, -3, 13, 3, '#3a2a34'); R(c, -5, 0, 11, 2, '#2c2028'); R(c, -3, 2, 7, 1, '#2c2028'); R(c, -1, 3, 3, 1, '#2c2028'); },
    cizme(c) {
      R(c, -3, -7, 5, 8, '#7fc0e0'); R(c, -3, -7, 5, 2, '#d0f0ff'); R(c, -3, 1, 9, 3, '#5a9cc0'); R(c, 2, 0, 4, 2, '#7fc0e0'); R(c, -3, 3, 9, 1, '#2c5a78');
      R(c, -8, -6, 5, 1, '#fff'); R(c, -9, -4, 6, 1, '#fff'); R(c, -8, -2, 5, 1, '#d8ecff');
    },
    kupa(c) { R(c, -5, -6, 11, 1, '#fff0a0'); R(c, -5, -5, 11, 4, '#f0c040'); R(c, -7, -5, 2, 3, '#c89820'); R(c, 6, -5, 2, 3, '#c89820'); R(c, -3, -1, 7, 2, '#c89820'); R(c, -1, 1, 3, 2, '#c89820'); R(c, -4, 3, 9, 2, '#f0c040'); R(c, -1, -4, 3, 2, '#f04868'); },
    tac(c) { R(c, -6, 0, 13, 4, '#f0c040'); R(c, -6, -4, 2, 4, '#f0c040'); R(c, -1, -5, 3, 5, '#f0c040'); R(c, 5, -4, 2, 4, '#f0c040'); R(c, -6, 0, 13, 1, '#fff0a0'); R(c, -1, 1, 3, 2, '#3cc4f0'); R(c, -5, 1, 2, 2, '#f04868'); R(c, 4, 1, 2, 2, '#3cd878'); },
    put(c) { R(c, -3, -7, 7, 6, '#40b090'); R(c, -2, -5, 2, 1, '#ffe060'); R(c, 1, -5, 2, 1, '#ffe060'); R(c, -5, -7, 2, 3, '#2c8870'); R(c, 4, -7, 2, 3, '#2c8870'); R(c, -2, -1, 5, 5, '#2c8870'); R(c, -4, 4, 9, 2, '#1c6050'); R(c, -1, -3, 3, 1, '#14483c'); },
    hazineSay(c) { R(c, -7, -3, 15, 7, '#7a4a20'); R(c, -7, -5, 15, 3, '#a06430'); R(c, -7, -2, 15, 1, '#d8b050'); R(c, -1, -3, 3, 4, '#ffe060'); },
    emanet(c, t) {
      const n = Math.sin((t || 0) * 3) > 0 ? 1 : 0;
      R(c, -5, -8 + n, 11, 11, '#ffc830'); R(c, -7, -6 + n, 15, 7, '#ffc830'); R(c, -3, -6 + n, 7, 7, '#fff4c0'); R(c, -1, -4 + n, 3, 3, '#ffffff');
      for (const [x, y] of [[0, -12], [0, 6], [-11, -3], [10, -3]]) R(c, x, y + n, 2, 3, '#ffe890');
    },
  };
  S.ikon = ikon;

  S.sandik = function (c, acikM) {
    R(c, -9, -9, 18, 9, '#7a4a20'); R(c, -9, -3, 18, 1, '#4c2c10'); R(c, -9, -9, 2, 9, '#c89830'); R(c, 7, -9, 2, 9, '#c89830');
    if (acikM) { R(c, -9, -15, 18, 4, '#5a3414'); R(c, -7, -11, 14, 2, '#ffd860'); R(c, -7, -9, 14, 2, '#2a1808'); }
    else { R(c, -9, -13, 18, 5, '#a06430'); R(c, -9, -13, 18, 1, '#d8a860'); R(c, -2, -9, 4, 4, '#ffd860'); }
  };
  S.kol = function (c, cekili, anlik) {
    R(c, -6, -3, 12, 3, '#5a5660'); R(c, -6, -3, 12, 1, '#8c8894');
    c.save(); c.translate(0, -3); c.rotate(cekili ? 0.7 : -0.7);
    R(c, -1, -11, 2, 11, '#a08a60'); R(c, -2, -14, 4, 4, anlik ? '#50d8d0' : '#d84848'); R(c, -2, -14, 2, 1, '#ffb0b0');
    c.restore();
  };
  S.durak = function (c, yandi, t) {
    R(c, -7, -3, 14, 3, '#544e58'); R(c, -5, -8, 10, 5, '#6c6470'); R(c, -7, -11, 14, 3, '#8a8290'); R(c, -7, -11, 14, 1, '#b0a8b4');
    if (yandi) {
      for (let i = 0; i < 3; i++) {
        const h = 5 + Math.sin(t * 9 + i * 2) * 2.5;
        R(c, -4 + i * 3, -11 - h, 3, h, i === 1 ? '#ffe080' : '#ff8a30');
      }
      R(c, -1, -14, 2, 3, '#fff6c0');
    } else R(c, -5, -12, 10, 1, '#2a2428');
  };
  S.mesale = function (c, t, renk) {
    R(c, -1, 0, 3, 8, '#6a4a28'); R(c, -3, 7, 7, 2, '#3e3a44'); R(c, -2, -1, 5, 2, '#8a6a34');
    for (let i = 0; i < 3; i++) {
      const h = 5 + Math.sin(t * 11 + i * 1.9) * 2;
      R(c, -2 + i * 1.5, -1 - h, 2, h, i === 1 ? '#fff0c0' : renk);
    }
  };
  S.blok = function (c, w, h) {
    R(c, 0, 0, w, h, '#8a8e98'); R(c, 0, 0, w, 2, '#c4c8d2'); R(c, 0, 0, 2, h, '#a8acb6'); R(c, 0, h - 3, w, 3, '#54565f'); R(c, w - 2, 0, 2, h, '#62646e');
    R(c, 5, 5, w - 10, h - 10, '#70747e'); R(c, 7, 7, w - 14, h - 14, '#3fbab0'); R(c, 9, 9, w - 18, h - 18, '#a0fff0');
    R(c, 3, 3, 2, 2, '#54565f'); R(c, w - 5, 3, 2, 2, '#54565f'); R(c, 3, h - 6, 2, 2, '#44464f'); R(c, w - 5, h - 6, 2, 2, '#44464f');
  };
  F.S = S;
  F.R = R;

  // HUD ikonları: DOM'da piksel keskinliğinde görünür
  F.ikonTuval = function (ad, arg, boy = 18, olcek = 2) {
    const cv = document.createElement('canvas');
    cv.width = boy; cv.height = boy;
    cv.style.width = boy * olcek + 'px'; cv.style.height = boy * olcek + 'px';
    cv.style.imageRendering = 'pixelated';
    const c = cv.getContext('2d');
    c.translate(boy / 2 | 0, boy / 2 | 0);
    S.ikon[ad](c, arg);
    return cv;
  };
})();
