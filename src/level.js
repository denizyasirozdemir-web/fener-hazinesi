// Dünya verisi: tüm harita dolu kayadan başlar, odalar oyulur. Koordinatlar karo cinsindendir.
(() => {
  const F = (window.F = window.F || {});
  F.TILE = 16;
  const T = F.TILE;
  // Karo kodları
  F.BOS = 0; F.KAYA = 1; F.TEK = 2; F.DIKEN = 3; F.TAVANDIKEN = 4; F.SAHTE = 5;

  // Bölge paletleri: taş, açık kenar, arka duvar, yosun
  const PAL = {
    giris: { tas: '#6d5a48', kenar: '#a58e6e', arka: '#2c241e', yosun: '#66803c' },
    salon: { tas: '#566078', kenar: '#8f9cb8', arka: '#1e2230', yosun: '#4a7a70' },
    mezar: { tas: '#4c6654', kenar: '#7fa384', arka: '#18251e', yosun: '#7ca83e' },
    galeri: { tas: '#64507a', kenar: '#9d84bb', arka: '#221a30', yosun: '#a0569a' },
    mahzen: { tas: '#3f6a72', kenar: '#70a8ae', arka: '#14262a', yosun: '#3f9a8a' },
    tapinak: { tas: '#6a7a92', kenar: '#b7cbe2', arka: '#20283a', yosun: '#8fd0d8' },
    hucre: { tas: '#6a7078', kenar: '#b4bcc6', arka: '#22252b', yosun: '#7a8894' },
    bekci: { tas: '#74443e', kenar: '#b8705e', arka: '#2a1414', yosun: '#a8452e' },
    kasa: { tas: '#8a6c34', kenar: '#e0bc5c', arka: '#32250e', yosun: '#d8a830' },
  };
  F.PAL = PAL;

  F.buildLevel = function () {
    const W = 236, H = 72;
    const t = new Uint8Array(W * H).fill(F.KAYA);
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[x + y * W] = v; };
    const oy = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, F.BOS); };
    const dol = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, F.KAYA); };
    const tek = (x, y, w) => { for (let i = x; i < x + w; i++) set(i, y, F.TEK); };
    const diken = (x, y, w) => { for (let i = x; i < x + w; i++) set(i, y, F.DIKEN); };

    const L = {
      W, H, t, ogeler: [], slimeler: [], yarasalar: [], kapilar: [], kollar: [], plakalar: [], bloklar: [],
      kopruler: [], sandiklar: [], duraklar: [], isiklar: [], ipuclari: [], sahte: [],
    };
    let sira = 0;
    const oge = (tur, x, y, ek) => L.ogeler.push({ id: sira++, tur, x: x * T + 8, y: y * T + 8, ...ek });
    const gem = (x, y, ek) => oge('gem', x, y, { renk: ek || 0 });
    const gemSira = (x, y, n, dx = 2, renk = 0) => { for (let i = 0; i < n; i++) gem(x + i * dx, y, renk); };
    const gemKavis = (x, y, n, dx, h, renk = 0) => {
      for (let i = 0; i < n; i++) gem(x + i * dx, y - Math.round(Math.sin((i / (n - 1)) * Math.PI) * h), renk);
    };
    const mesale = (x, y, renk = '#ffb060', r = 92) => L.isiklar.push({ x: x * T + 8, y: y * T + 8, r, renk, tur: 'mesale' });
    const kristal = (x, y, renk, r = 60) => L.isiklar.push({ x: x * T + 8, y: y * T + 8, r, renk, tur: 'kristal' });
    const durak = (x, y) => L.duraklar.push({ id: L.duraklar.length, x: x * T + 8, y: (y + 1) * T });
    const kapi = (id, tur, x, y, w, h, ek) => L.kapilar.push({ id, tur, x: x * T, y: y * T, w: w * T, h: h * T, acik: 0, acilis: false, ...ek });
    const slime = (x, y, sol, sag, ek) => L.slimeler.push({ x: x * T, y: (y + 1) * T - 11, w: 14, h: 11, sol: sol * T, sag: (sag + 1) * T, ...ek });
    const yarasa = (x, y) => L.yarasalar.push({ x: x * T + 8, y: y * T + 6 });
    const ipucu = (x, y, w, h, anahtar) => L.ipuclari.push({ x: x * T, y: y * T, w: w * T, h: h * T, anahtar });

    L.bolgeler = [
      { id: 'kasa', x: 166, y: 0, w: 42, h: 15, pal: 'kasa' },
      { id: 'bekci', x: 112, y: 0, w: 54, h: 16, pal: 'bekci' },
      { id: 'hucre', x: 170, y: 15, w: 34, h: 11, pal: 'hucre' },
      { id: 'tapinak', x: 209, y: 15, w: 27, h: 26, pal: 'tapinak' },
      { id: 'mahzen', x: 170, y: 26, w: 39, h: 15, pal: 'mahzen' },
      { id: 'galeri', x: 112, y: 16, w: 58, h: 22, pal: 'galeri' },
      { id: 'salon', x: 50, y: 0, w: 62, h: 44, pal: 'salon', acik: true },
      { id: 'mezar', x: 0, y: 44, w: 130, h: 28, pal: 'mezar' },
      { id: 'giris', x: 0, y: 0, w: 50, h: 44, pal: 'giris' },
    ];

    // ------ 1. Yıkık Giriş ------
    oy(3, 10, 47, 14);
    oy(5, 2, 4, 8); // tepeden gün ışığı sızan yarık
    dol(15, 22, 3, 2);
    oy(23, 24, 4, 3); diken(23, 26, 4);
    tek(30, 20, 5); tek(37, 17, 4); tek(42, 13, 4);
    oy(50, 20, 10, 4);
    durak(5, 23);
    L.baslangic = { x: 9 * T, y: 24 * T };
    L.gunIsigi = { x: 7 * T, y: 2 * T };
    mesale(13, 18); mesale(28, 18); mesale(47, 19);
    gemSira(19, 22, 2, 1); gemKavis(22, 22, 5, 1.5, 3); gemSira(31, 19, 3, 2, 1); gem(38, 16, 2);
    oge('tilsim', 43, 12); // tüy çizmelerle dönülebilen gizli ödül
    slime(33, 23, 29, 47);
    ipucu(4, 14, 8, 10, 'ipucuHareket'); ipucu(14, 16, 8, 8, 'ipucuZipla');
    ipucu(28, 16, 12, 8, 'ipucuEzme');

    // ------ 2. Büyük Salon ------
    oy(60, 6, 52, 28);
    dol(60, 24, 12, 10);
    durak(64, 23);
    tek(73, 31, 3); tek(77, 28, 3); tek(73, 25, 3); // salon tabanından rafa dönüş
    tek(75, 21, 4); tek(67, 18, 3); tek(63, 15, 4); tek(68, 10, 3);
    tek(82, 18, 4); tek(89, 15, 4); tek(95, 13, 3);
    dol(100, 12, 12, 2);
    oy(112, 30, 8, 4); oy(112, 8, 8, 4);
    oy(84, 34, 6, 10); // mezarlara inen kuyu
    mesale(62, 21); mesale(73, 28); mesale(94, 28); mesale(108, 28); mesale(106, 9, '#9fd0ff');
    mesale(84, 12); kristal(63, 12, '#7fd8ff', 50);
    gemSira(76, 20, 2, 2); gemSira(83, 17, 2, 2, 1); gemSira(90, 14, 2, 2, 2);
    oge('hazine', 64, 14, { ad: 'kupa', deger: 150 });
    oge('hazine', 69, 9, { ad: 'tac', deger: 300 });
    gemSira(92, 33, 4, 2);
    oge('kalp', 110, 33);
    slime(78, 33, 73, 83); slime(100, 33, 91, 110);
    yarasa(80, 6); yarasa(104, 6);
    kapi('bronz', 'bronz', 112, 30, 1, 4);
    kapi('gumus', 'gumus', 111, 8, 1, 4);
    ipucu(104, 30, 8, 4, 'ipucuBronzKapi');
    ipucu(100, 8, 11, 4, 'ipucuGumusKapi');
    ipucu(82, 30, 10, 4, 'ipucuKuyu');

    // ------ 3. Mezarlar ------
    oy(46, 44, 70, 10);
    tek(84, 51, 3); tek(87, 48, 3); tek(84, 45, 3); tek(87, 42, 3); tek(84, 39, 3); tek(87, 36, 3); // kuyu rafları: oyma işleminden sonra
    oy(30, 46, 16, 8);
    oy(18, 48, 10, 6);
    for (let y = 50; y < 54; y++) for (let x = 28; x < 30; x++) { set(x, y, F.SAHTE); L.sahte.push({ x, y }); }
    dol(70, 44, 1, 6);
    dol(96, 52, 2, 2);
    diken(100, 53, 4);
    oy(52, 54, 10, 4); diken(52, 57, 10);
    durak(79, 53);
    mesale(80, 46, '#b0ff90'); mesale(106, 46, '#b0ff90'); mesale(60, 47, '#b0ff90');
    mesale(38, 48, '#ffcf70', 80); kristal(22, 50, '#ffd080', 50);
    gemSira(91, 53, 2, 2, 1); gemSira(106, 53, 4, 1);
    gemKavis(100, 51, 4, 1.2, 1, 2);
    gemSira(53, 52, 5, 2, 2);
    oge('tilsim', 41, 53);
    oge('anahtar', 33, 52, { ad: 'bronz' });
    L.kollar.push({ id: 'k1', x: 113 * T + 8, y: 54 * T, hedef: 'g1', cekili: false });
    L.kollar.push({ id: 'k2', x: 65 * T + 8, y: 54 * T, hedef: 'kopru1', cekili: false });
    kapi('g1', 'kol', 70, 50, 1, 4);
    L.kopruler.push({ id: 'kopru1', x: 52, y: 54, n: 10, ilerleme: 0, acik: false });
    slime(106, 53, 98, 112, { renk: 1 }); slime(92, 53, 90, 95, { renk: 1 }); slime(64, 53, 62, 69);
    yarasa(40, 46); yarasa(49, 44); yarasa(58, 44);
    L.sandiklar.push({ id: 's1', x: 21 * T + 8, y: 54 * T, acik: false, gem: 12, tilsim: 1 });
    ipucu(66, 50, 4, 4, 'ipucuKapaliKol'); ipucu(109, 50, 6, 4, 'ipucuKol');
    ipucu(30, 50, 8, 4, 'ipucuDuvar');

    // ------ 4. Sivri Galeri ------
    oy(120, 18, 50, 16);
    durak(123, 33);
    diken(130, 33, 4);
    dol(138, 31, 3, 3); dol(148, 31, 3, 3);
    diken(141, 33, 7); tek(142, 28, 3);
    diken(151, 33, 4); tek(152, 30, 3);
    dol(158, 25, 12, 2);
    oy(170, 30, 6, 4); oy(170, 21, 8, 4);
    mesale(125, 26, '#d0a0ff'); mesale(136, 22, '#d0a0ff'); mesale(146, 24, '#d0a0ff'); mesale(162, 29, '#d0a0ff'); mesale(162, 21, '#d0a0ff');
    gemKavis(129, 32, 5, 1.4, 3, 1); gem(143, 27, 2); gem(144, 25, 2); gemSira(158, 33, 5, 2);
    oge('hazine', 166, 24, { ad: 'put', deger: 200 });
    slime(160, 33, 156, 169, { renk: 2 }); slime(126, 33, 121, 129, { renk: 2 });
    yarasa(135, 18); yarasa(146, 18); yarasa(156, 18);
    ipucu(152, 26, 6, 5, 'ipucuYuksek');

    // ------ 5. Mühürlü Mahzen ------
    oy(176, 27, 40, 7);
    oy(200, 34, 3, 3);
    durak(179, 33);
    mesale(182, 29, '#80e0e0'); mesale(196, 29, '#80e0e0'); mesale(212, 29, '#80e0e0');
    L.bloklar.push({ x: 186 * T, y: 34 * T - 24, w: 24, h: 24, bx: 186 * T, by: 34 * T - 24, vy: 0, zemin: false });
    L.plakalar.push({ id: 'p1', x: 200 * T, y: 37 * T - 4, w: 3 * T, h: 4, hedef: 'p1k', basili: false, kilit: false });
    kapi('p1k', 'plaka', 208, 27, 1, 7);
    L.kollar.push({ id: 'k3', x: 196 * T + 8, y: 34 * T, hedef: 'sifirla', cekili: false, anlik: true });
    gemSira(190, 33, 3, 2, 1); gemSira(211, 33, 3, 1, 2);
    oge('kalp', 214, 33);
    yarasa(212, 27);
    ipucu(180, 29, 10, 5, 'ipucuBlok'); ipucu(194, 29, 5, 5, 'ipucuSifirla'); ipucu(203, 28, 5, 6, 'ipucuPlaka');

    // ------ 6. Tüy Tapınağı ------
    oy(216, 22, 14, 12);
    mesale(218, 26, '#c0e8ff'); mesale(227, 26, '#c0e8ff');
    oge('cizme', 223, 32);

    // ------ 7. Gümüş Hücre ------
    oy(178, 16, 22, 9);
    durak(173, 24);
    diken(180, 24, 6); dol(186, 23, 2, 2); diken(188, 24, 6);
    tek(188, 19, 3);
    mesale(176, 22, '#dfe8f4'); mesale(197, 18, '#dfe8f4'); kristal(182, 18, '#a0c8ff', 54);
    oge('tilsim', 189, 18);
    oge('anahtar', 197, 23, { ad: 'gumus' });
    gemSira(183, 20, 2, 2, 2); gem(192, 21, 2);
    yarasa(183, 16); yarasa(192, 16);

    // ------ 8. Bekçinin Salonu ------
    oy(120, 3, 46, 11);
    tek(127, 10, 5); tek(153, 10, 5); tek(140, 8, 5);
    durak(115, 11);
    mesale(116, 9, '#ff9060'); mesale(124, 6, '#ff5030', 110); mesale(161, 6, '#ff5030', 110); mesale(143, 5, '#ff7040', 110);
    kapi('muhur', 'muhur', 119, 8, 1, 4, { acik: 1, acilis: true });
    oy(166, 10, 14, 4);
    kapi('bekciCikis', 'bekci', 165, 10, 1, 4);
    L.bekci = { sol: 121 * T, sag: 165 * T, zemin: 14 * T, tavan: 3 * T, x: 143 * T, tetik: 124 * T };

    // ------ 9. Gizli Hazine ------
    oy(180, 2, 26, 12);
    mesale(170, 11, '#ffd870'); mesale(184, 7, '#ffd870', 120); mesale(202, 7, '#ffd870', 120); kristal(193, 5, '#fff0b0', 140);
    oge('emanet', 193, 12);
    gemKavis(186, 13, 8, 2.1, 3, 3);

    L.bolge = (px, py) => {
      const x = px / T, y = py / T;
      for (const b of L.bolgeler) if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) return b;
      return L.bolgeler[L.bolgeler.length - 1];
    };
    L.tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? F.KAYA : t[x + y * W]);
    return L;
  };
})();
