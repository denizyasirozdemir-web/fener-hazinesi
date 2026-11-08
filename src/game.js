// Oyun mantığı: sabit 60 Hz adım, gerçek zamandan bağımsız (test botu aynı kodu sürer).
(() => {
  const F = window.F, T = F.TILE, DT = 1 / 60;
  F.DT = DT;
  const PH = {
    kos: 112, ivZemin: 980, ivHava: 640, sur: 1200, yer: 780, zipla: 296, zipla2: 255, kes: 0.42, dusme: 340,
    coyote: 0.09, tampon: 0.11, it: 40, tepe: 0.62,
  };
  F.PH = PH;
  const carp = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const yaklas = (v, h, m) => (v < h ? Math.min(v + m, h) : Math.max(v - m, h));
  const BOS_GIRDI = { sol: 0, sag: 0, yukari: 0, asagi: 0, zipla: 0, ziplaB: 0, eylem: 0, eylemB: 0 };

  class Oyun {
    constructor() {
      this.L = F.buildLevel();
      this.on = { ses() {}, mesaj() {}, kayit() {}, bolge() {}, bitti() {} };
      this.tanri = false; this.dusmansiz = false;
      this.gorusW = 480; this.gorusH = 270;
      this.sifirla();
    }

    sifirla() {
      this.L = F.buildLevel();
      const L = this.L;
      this.alinan = new Set();
      this.toplam = {
        gem: L.ogeler.filter(o => o.tur === 'gem').length + L.sandiklar.reduce((a, s) => a + s.gem, 0),
        hazine: L.ogeler.filter(o => o.tur === 'hazine').length + L.sandiklar.length,
        tilsim: L.ogeler.filter(o => o.tur === 'tilsim').length + L.sandiklar.reduce((a, s) => a + (s.tilsim || 0), 0),
      };
      this.env = { bronz: 0, gumus: 0, cizme: 0 };
      this.sayac = { gem: 0, hazine: 0, tilsim: 0, altin: 0, olum: 0, ezilen: 0 };
      this.can = 3; this.canMax = 3; this.kalkan = 0;
      this.sure = 0;
      this.goren = new Set();
      this.gezilen = new Uint8Array(Math.ceil(L.W / 4) * Math.ceil(L.H / 4));
      this.durak = 0;
      this.p = this.yeniOyuncu(L.baslangic.x, L.baslangic.y);
      this.bekciOldu = false;
      this.parca = []; this.yazilar = []; this.mermiler = [];
      this.sars = 0; this.dur = 0; this.bitis = 0; this.flash = 0;
      this.bolgeId = '';
      this.kare = 0;
      this.dusmanlariKur();
      this.bekciKur();
      this.kam = { x: 0, y: 0, ox: 0, oy: 0 };
      this.kamAnlik();
    }

    yeniOyuncu(x, altY) {
      return {
        x: x - 5, y: altY - 18, w: 10, h: 18, vx: 0, vy: 0, zemin: false, yon: 1, coy: 0, tampon: 0, ziplama: 0, kesildi: true,
        duruyor: 0, itiyor: null, inv: 0, olu: 0, animT: 0, toz: 0, inis: 0, guvenli: { x: x - 5, y: altY - 18 }, guvT: 0, cift: 0, tekUstu: false, inme: 0,
      };
    }

    dusmanlariKur() {
      const L = this.L;
      this.slimeler = L.slimeler.map(s => ({ ...s, vx: 22, canli: true, olumT: 0, faz: s.x * 0.13, vy: 0 }));
      this.yarasalar = L.yarasalar.map(b => ({ ...b, ex: b.x, ey: b.y, w: 12, h: 8, durum: 'asili', t: 0, canli: true, kx: 0, ky: 0, hx: 0, olumT: 0, sonX: b.x, cd: 0 }));
    }

    bekciKur() {
      const k = this.L.bekci;
      this.bekci = {
        x: k.x - 17, y: k.zemin - 38, w: 34, h: 38, vy: 0, can: 4, durum: 'uyku', t: 0, faz: 0, parla: 0, seri: 0, hedefX: 0, kanat: 0,
      };
      this.mermiler = [];
    }

    // ----- Çarpışma -----
    katiKutular(b) {
      const a = [];
      for (const k of this.L.kapilar) if (k.acik < 1) a.push({ x: k.x, y: k.y, w: k.w, h: k.h * (1 - k.acik) });
      for (const o of this.L.bloklar) if (o !== b) a.push(o);
      return a;
    }
    tumKati(x, y) { const v = this.L.tile(x, y); return v === F.KAYA; }

    tasiX(b, dx) {
      if (!dx) return false;
      b.x += dx;
      let vur = false;
      const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
      const sut = Math.floor((dx > 0 ? b.x + b.w - 0.01 : b.x) / T);
      for (let y = y0; y <= y1; y++) if (this.tumKati(sut, y)) {
        b.x = dx > 0 ? sut * T - b.w : (sut + 1) * T; vur = true; break;
      }
      for (const k of this.katiKutular(b)) if (carp(b, k)) {
        b.x = dx > 0 ? k.x - b.w : k.x + k.w; vur = k;
      }
      return vur;
    }

    tasiY(b, dy, inme) {
      if (!dy) return false;
      const eskiAlt = b.y + b.h;
      b.y += dy;
      let vur = false;
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
      const sat = Math.floor((dy > 0 ? b.y + b.h - 0.01 : b.y) / T);
      for (let x = x0; x <= x1; x++) {
        const v = this.L.tile(x, sat);
        if (v === F.KAYA || (v === F.TEK && dy > 0 && !inme && eskiAlt <= sat * T + 0.5)) {
          b.y = dy > 0 ? sat * T - b.h : (sat + 1) * T; vur = v; break;
        }
      }
      for (const k of this.katiKutular(b)) if (carp(b, k)) {
        b.y = dy > 0 ? k.y - b.h : k.y + k.h; vur = vur || F.KAYA;
      }
      return vur;
    }

    icinde(b) {
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
      const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.tumKati(x, y)) return true;
      return this.katiKutular(b).some(k => carp(b, k));
    }

    // Karakter hareketi; botun yol araması da bu saf fonksiyonu kullanır.
    oyuncuHareket(p, g, dt = DT) {
      const PHY = PH;
      const yon = (g.sag ? 1 : 0) - (g.sol ? 1 : 0);
      if (yon) p.yon = yon;
      const hedef = yon * PHY.kos * (p.itiyor ? PHY.it / PHY.kos : 1);
      const iv = p.zemin ? (yon ? PHY.ivZemin : PHY.sur) : PHY.ivHava;
      p.vx = yaklas(p.vx, hedef, iv * dt);
      p.coy = p.zemin ? PHY.coyote : Math.max(0, p.coy - dt);
      p.tampon = g.ziplaB ? PHY.tampon : Math.max(0, p.tampon - dt);
      p.inme = Math.max(0, p.inme - dt);
      let sonuc = '';
      if (p.tampon > 0) {
        if (p.coy > 0) {
          if (g.asagi && p.tekUstu) { p.inme = 0.18; p.y += 1; }
          else { p.vy = -PHY.zipla; sonuc = 'zipla'; p.kesildi = false; }
          p.coy = 0; p.tampon = 0; p.zemin = false;
        } else if (this.env.cizme && !p.ziplama) {
          p.vy = -PHY.zipla2; p.ziplama = 1; p.tampon = 0; p.kesildi = false; sonuc = 'cift'; p.cift = 0.3;
        }
      }
      if (!g.zipla && p.vy < 0 && !p.kesildi) { p.vy *= PHY.kes; p.kesildi = true; }
      const tepe = Math.abs(p.vy) < 45 && g.zipla ? PHY.tepe : 1;
      p.vy = Math.min(p.vy + PHY.yer * tepe * dt, PHY.dusme);
      p.itiyor = null;
      const v = this.tasiX(p, p.vx * dt);
      if (v) {
        if (v && v.bx !== undefined && p.zemin && yon && Math.sign(p.vx) === yon) p.itiyor = v;
        p.vx = 0;
      }
      const alt = this.tasiY(p, p.vy * dt + 0.0, p.inme > 0);
      const zeminOnce = p.zemin;
      p.zemin = false; p.tekUstu = false;
      if (alt) {
        if (p.vy > 0) { p.zemin = true; p.ziplama = 0; p.kesildi = true; p.tekUstu = alt === F.TEK; if (!zeminOnce) sonuc = sonuc || 'inis'; }
        p.vy = Math.max(0, p.vy) * 0;
      }
      if (!p.zemin && p.vy === 0) p.vy = 1;
      return sonuc;
    }

    dikenVar(p) {
      const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 0.01) / T);
      const y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 0.01) / T);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const v = this.L.tile(x, y);
        if (v === F.DIKEN && carp(p, { x: x * T + 2, y: y * T + 8, w: 12, h: 8 })) return true;
      }
      return false;
    }

    // ----- Ana adım -----
    adim(g = BOS_GIRDI) {
      this.kare++;
      this.flash = Math.max(0, this.flash - DT * 2);
      this.sars = Math.max(0, this.sars - DT * 16);
      this.parcalar();
      if (this.dur > 0) { this.dur -= DT; return; }
      if (this.bitis > 0) {
        this.bitis += DT;
        if (this.bitis > 3.2 && !this.bittiBildirildi) { this.bittiBildirildi = true; this.on.bitti(); }
        this.kamera(); return;
      }
      this.sure += DT;
      const p = this.p;
      this.kapilarAdim();
      if (p.olu > 0) {
        p.olu += DT;
        p.vy = Math.min(p.vy + 500 * DT, 300); p.y += p.vy * DT * 0.5;
        if (p.olu > 1.5) this.yenidenDog();
        this.kamera(); return;
      }
      p.inv = Math.max(0, p.inv - DT);
      const s = this.oyuncuHareket(p, g);
      this.hareketSesleri(p, s);
      if (this.icinde(p)) this.kurtar(p);
      this.bloklarAdim(p);
      if (g.eylemB) this.eylem();
      this.plakalarAdim();
      if (!this.dusmansiz) { this.slimeAdim(p); this.yarasaAdim(p); }
      this.bekciAdim(p);
      this.ogelerAdim(p);
      if (this.dikenVar(p)) this.dikenVur(p);
      this.tetikler(p);
      this.kamera();
    }

    hareketSesleri(p, s) {
      if (s === 'zipla') { this.on.ses('zipla'); this.toz(p.x + 5, p.y + 18, 4); }
      if (s === 'cift') { this.on.ses('cift'); for (let i = 0; i < 12; i++) this.parcaEkle(p.x + 5, p.y + 18, (Math.random() - 0.5) * 80, Math.random() * 40, 0.5, '#d8f0ff', 1); }
      if (s === 'inis') { this.on.ses('inis'); this.toz(p.x + 5, p.y + 18, 3); }
      if (p.zemin && Math.abs(p.vx) > 40) {
        p.animT += Math.abs(p.vx) * DT * 0.024;
        p.toz -= DT;
        if (p.toz < 0) { p.toz = 0.27; this.on.ses('adim'); if (!p.itiyor) this.parcaEkle(p.x + 5 - p.yon * 4, p.y + 18, -p.yon * 12, -8, 0.3, '#8a7a68', 1); }
      } else if (!p.zemin) p.animT = 0;
      p.cift = Math.max(0, p.cift - DT);
      // son güvenli zemin (diken dönüşü için)
      p.guvT -= DT;
      if (p.zemin && p.guvT <= 0 && !p.tekUstu) {
        const cx = Math.floor((p.x + 5) / T), ay = Math.round((p.y + 18) / T);
        const L = this.L;
        const temiz = [-2, -1, 0, 1, 2].every(d => L.tile(cx + d, ay - 1) !== F.DIKEN && L.tile(cx + d, ay) === F.KAYA);
        if (temiz) { p.guvenli = { x: p.x, y: p.y }; p.guvT = 0.15; }
      }
    }

    kurtar(p) {
      for (const [dx, dy] of [[0, -4], [0, -8], [-8, 0], [8, 0], [0, -16], [-16, 0], [16, 0], [0, -26]]) {
        const d = { ...p, x: p.x + dx, y: p.y + dy };
        if (!this.icinde(d)) { p.x = d.x; p.y = d.y; return; }
      }
    }

    kapilarAdim() {
      for (const k of this.L.kapilar) {
        const hiz = k.tur === 'plaka' ? (k.acilis ? 1.6 : 5) : k.tur === 'muhur' ? 3.5 : 1.1;
        const once = k.acik;
        k.acik = yaklas(k.acik, k.acilis ? 1 : 0, hiz * DT);
        if (once !== k.acik && this.kare % 14 === 0) this.on.ses('kapi');
        if (once < 1 && k.acik === 1 && k.acilis && k.tur !== 'muhur') this.sars = Math.max(this.sars, 1.5);
      }
      for (const b of this.L.kopruler) if (b.acik && b.ilerleme < b.n) {
        const once = Math.floor(b.ilerleme);
        b.ilerleme = Math.min(b.n, b.ilerleme + DT * 14);
        for (let i = once; i < Math.floor(b.ilerleme); i++) {
          this.L.t[b.x + i + b.y * this.L.W] = F.KAYA;
          this.on.ses('blok');
          this.toz((b.x + i) * T + 8, b.y * T, 2);
        }
      }
    }
    kapiBul(id) { return this.L.kapilar.find(k => k.id === id); }

    bloklarAdim(p) {
      for (const b of this.L.bloklar) {
        if (p.itiyor === b && b.zemin) {
          const once = b.x;
          this.tasiX(b, p.yon * PH.it * DT);
          if (b.x !== once) {
            if (this.kare % 16 === 0) { this.on.ses('surtme'); this.toz(p.yon > 0 ? b.x : b.x + b.w, b.y + b.h, 1); }
            if (this.icinde(p)) p.x = p.yon > 0 ? b.x - p.w : b.x + b.w;
          }
        }
        b.vy = Math.min(b.vy + 700 * DT, 320);
        const v = this.tasiY(b, b.vy * DT, true);
        const once = b.zemin;
        b.zemin = !!v && b.vy > 0;
        if (b.zemin) {
          if (!once && b.vy > 90) { this.on.ses('blok'); this.sars = Math.max(this.sars, 2); this.toz(b.x + 12, b.y + b.h, 9); }
          b.vy = 0;
        }
      }
    }

    plakalarAdim() {
      for (const pl of this.L.plakalar) {
        const alan = { x: pl.x, y: pl.y - 2, w: pl.w, h: pl.h + 4 };
        const blok = this.L.bloklar.some(b => carp(b, alan));
        const bas = blok || (this.p.olu <= 0 && carp(this.p, alan));
        if (bas !== pl.basili) {
          pl.basili = bas;
          this.on.ses(bas ? 'plaka' : 'kapi');
          if (bas && blok) this.on.mesaj('plakaAcik');
        }
        pl.kalici = blok;
        this.kapiBul(pl.hedef).acilis = bas;
      }
    }

    eylem() {
      const p = this.p, cx = p.x + 5, ay = p.y + 18;
      for (const k of this.L.kollar) {
        if (Math.abs(k.x - cx) < 18 && Math.abs(k.y - ay) < 14 && !(k.cekili && !k.anlik)) { this.kolCek(k); return; }
      }
      for (const s of this.L.sandiklar) {
        if (!s.acik && Math.abs(s.x - cx) < 18 && Math.abs(s.y - ay) < 14) { this.sandikAc(s); return; }
      }
    }

    kolCek(k) {
      this.on.ses('kol');
      k.cekili = true; k.anlikT = 0.5;
      if (k.hedef === 'g1') { this.kapiBul('g1').acilis = true; this.on.mesaj('kolActi'); }
      else if (k.hedef === 'kopru1') { this.L.kopruler[0].acik = true; this.on.mesaj('kopruActi'); }
      else if (k.hedef === 'sifirla') { for (const b of this.L.bloklar) this.blokSifirla(b); this.on.mesaj('blokDondu'); }
      this.kaydet();
    }

    blokSifirla(b) {
      this.toz(b.x + 12, b.y + 12, 10);
      b.x = b.bx; b.y = b.by; b.vy = 0;
      this.toz(b.x + 12, b.y + 12, 10);
      this.on.ses('blok');
      if (this.icinde(this.p)) this.kurtar(this.p);
    }

    sandikAc(s) {
      s.acik = true; this.alinan.add('s:' + s.id);
      this.on.ses('hazine');
      this.sayac.gem += s.gem; this.sayac.altin += s.gem * 10; this.sayac.hazine++; this.sayac.altin += 250;
      for (let i = 0; i < 30; i++) this.parcaEkle(s.x, s.y - 8, (Math.random() - 0.5) * 140, -60 - Math.random() * 130, 0.9, ['#ffd860', '#ff6a8a', '#70e0ff'][i % 3], 2, 300);
      if (s.tilsim) this.tilsimAl();
      this.on.mesaj('sandik', { n: s.gem });
      this.kaydet();
    }

    tilsimAl() {
      this.kalkan = Math.min(3, this.kalkan + 1); this.sayac.tilsim++;
    }

    slimeAdim(p) {
      for (const s of this.slimeler) {
        if (!s.canli) { s.olumT += DT; continue; }
        if (Math.abs(s.x - p.x) > 340) continue;
        s.faz += DT * 7;
        const dx = s.vx * DT * (0.45 + 0.55 * Math.abs(Math.sin(s.faz)));
        const vur = this.tasiX(s, dx);
        const onX = s.vx > 0 ? s.x + s.w + 1 : s.x - 1;
        const zemin = this.L.tile(Math.floor(onX / T), Math.floor((s.y + s.h + 1) / T));
        const bosluk = zemin !== F.KAYA && zemin !== F.TEK;
        const onDiken = this.L.tile(Math.floor(onX / T), Math.floor((s.y + s.h - 2) / T)) === F.DIKEN;
        if (vur || bosluk || onDiken || (s.vx > 0 && s.x + s.w >= s.sag) || (s.vx < 0 && s.x <= s.sol)) s.vx = -s.vx;
        if (p.olu <= 0 && carp(p, s)) {
          if (p.vy > 20 && p.y + p.h < s.y + s.h * 0.75) this.ez(s, p);
          else this.vur(p, s.x + s.w / 2);
        }
      }
    }

    ez(d, p) {
      d.canli = false; d.olumT = 0;
      p.vy = -240; p.kesildi = false; p.ziplama = 0;
      this.sayac.ezilen++; this.sayac.altin += 25;
      this.on.ses('ezme'); this.dur = 0.05; this.sars = Math.max(this.sars, 2);
      const r = d.renk === 1 ? '#a0e060' : d.renk === 2 ? '#e070d0' : d.w > 12 ? '#70d870' : '#a08aa8';
      for (let i = 0; i < 12; i++) this.parcaEkle(d.x + 7, d.y + 6, (Math.random() - 0.5) * 120, -Math.random() * 110, 0.5, r, 2, 300);
    }

    yarasaAdim(p) {
      for (const b of this.yarasalar) {
        if (!b.canli) continue;
        b.t += DT; b.cd = Math.max(0, b.cd - DT);
        if (b.durum === 'asili') {
          const dx = p.x + 5 - b.ex, dy = p.y - b.ey;
          if (b.cd <= 0 && Math.abs(dx) < 86 && dy > 0 && dy < 150 && p.olu <= 0) {
            b.durum = 'dalis'; b.t = 0; b.kx = b.x; b.ky = b.y;
            b.hx = p.x + 5 + Math.sign(dx || 1) * 44; b.dy = Math.min(p.y + 9 - b.ey, 130);
            this.on.ses('yarasa');
          }
        } else if (b.durum === 'dalis') {
          const u = Math.min(1, b.t / 1.05);
          const nx = b.kx + (b.hx - b.kx) * u, ny = b.ey + b.dy * Math.sin(u * Math.PI);
          b.sonX = b.x; b.x = nx; b.y = ny;
          if (u >= 1) { b.durum = 'don'; b.t = 0; b.kx = b.x; b.ky = b.y; }
        } else {
          const u = Math.min(1, b.t / 0.9);
          b.sonX = b.x; b.x = b.kx + (b.ex - b.kx) * u; b.y = b.ky + (b.ey - b.ky) * u;
          if (u >= 1) { b.durum = 'asili'; b.cd = 1.4; }
        }
        if (b.durum !== 'asili' && p.olu <= 0) {
          const k = { x: b.x - 6, y: b.y - 4, w: 12, h: 8 };
          if (carp(p, k)) {
            if (p.vy > 20 && p.y + p.h < k.y + 6) { const d = { x: k.x, y: k.y, w: 12 }; b.canli = false; this.ez(d, p); }
            else this.vur(p, b.x);
          }
        }
      }
    }

    vur(p, kaynakX) {
      if (p.inv > 0 || this.tanri || p.olu > 0) return false;
      if (this.kalkan > 0) {
        this.kalkan--; this.on.ses('kalkan');
        for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; this.parcaEkle(p.x + 5, p.y + 9, Math.cos(a) * 90, Math.sin(a) * 90, 0.45, '#8fd8ff', 1); }
      } else {
        this.can--; this.on.ses('hasar');
        this.dur = 0.07;
      }
      p.inv = 1.4; this.sars = Math.max(this.sars, 4); this.flash = 0.3;
      if (kaynakX !== undefined) { p.vx = (p.x + 5 < kaynakX ? -1 : 1) * 120; p.vy = -170; p.zemin = false; p.kesildi = true; }
      if (this.can <= 0) this.ol();
      return true;
    }

    dikenVur(p) {
      this.vur(p);
      if (p.olu > 0) return;
      p.x = p.guvenli.x; p.y = p.guvenli.y; p.vx = 0; p.vy = 0;
      this.toz(p.x + 5, p.y + 18, 8);
    }

    ol() {
      const p = this.p;
      p.olu = 0.001; p.vy = -180; this.sayac.olum++;
      this.on.ses('olum');
    }

    yenidenDog() {
      const d = this.L.duraklar[this.durak], L = this.L;
      const yeni = this.yeniOyuncu(d.x, d.y);
      this.p = yeni; yeni.inv = 1.2;
      this.can = this.canMax;
      this.dusmanlariKur();
      if (!this.bekciOldu) { this.bekciKur(); this.on.bekci?.(false); const m = this.kapiBul('muhur'); m.acilis = true; m.acik = 1; }
      for (const b of L.bloklar) if (!L.plakalar[0].kalici) { b.x = b.bx; b.y = b.by; b.vy = 0; }
      this.kamAnlik();
    }

    ogelerAdim(p) {
      const k = { x: p.x - 3, y: p.y - 2, w: p.w + 6, h: p.h + 4 };
      for (const o of this.L.ogeler) {
        if (this.alinan.has(o.id)) continue;
        if (Math.abs(o.x - p.x) > 26 || Math.abs(o.y - p.y) > 30) continue;
        if (!carp(k, { x: o.x - 6, y: o.y - 7, w: 12, h: 14 })) continue;
        this.al(o);
      }
      for (const d of this.L.duraklar) {
        if (d.id !== this.durak && Math.abs(d.x - p.x - 5) < 14 && Math.abs(d.y - p.y - 18) < 20 && p.olu <= 0) {
          this.durak = d.id; d.yandi = true; this.can = this.canMax;
          this.on.ses('durak'); this.on.mesaj('durak'); this.kaydet();
          for (let i = 0; i < 16; i++) this.parcaEkle(d.x, d.y - 14, (Math.random() - 0.5) * 50, -40 - Math.random() * 60, 0.8, '#ffc060', 1);
        }
      }
    }

    al(o) {
      this.alinan.add(o.id);
      const pc = (r, n) => { for (let i = 0; i < n; i++) this.parcaEkle(o.x, o.y, (Math.random() - 0.5) * 90, (Math.random() - 0.6) * 90, 0.5, r, 1); };
      switch (o.tur) {
        case 'gem': {
          const d = [10, 20, 30, 50][o.renk];
          this.sayac.gem++; this.sayac.altin += d;
          this.on.ses('gem'); pc(['#70e0ff', '#ff6a8a', '#7cf09a', '#ffe070'][o.renk], 6);
          this.yazilar.push({ x: o.x, y: o.y - 6, s: '+' + d, t: 0.7 });
          break;
        }
        case 'hazine':
          this.sayac.hazine++; this.sayac.altin += o.deger;
          this.on.ses('hazine'); pc('#ffd860', 22); this.on.mesaj('hazine_' + o.ad, { n: o.deger });
          break;
        case 'kalp':
          this.can = Math.min(this.canMax, this.can + 1); this.on.ses('kalp'); pc('#ff7088', 10);
          break;
        case 'tilsim':
          this.tilsimAl(); this.on.ses('kalkan'); pc('#8fd8ff', 16); this.on.mesaj('tilsim');
          break;
        case 'anahtar':
          this.env[o.ad] = 1; this.on.ses('anahtar'); pc(o.ad === 'bronz' ? '#e09a50' : '#e0ecff', 26);
          this.sars = 3; this.on.mesaj(o.ad === 'bronz' ? 'bronzAnahtar' : 'gumusAnahtar', { uzun: 1 });
          break;
        case 'cizme':
          this.env.cizme = 1; this.on.ses('anahtar'); pc('#d8f0ff', 34); this.sars = 3;
          this.on.mesaj('cizme', { uzun: 1 });
          break;
        case 'emanet':
          this.on.ses('zafer'); this.bitis = 0.01; pc('#fff0a0', 60); this.flash = 1;
          this.sayac.altin += 1000; this.kaydet(true);
          break;
      }
      this.kaydet(this.bitis > 0);
    }

    tetikler(p) {
      const L = this.L;
      // kilitli kapılar
      for (const k of L.kapilar) {
        if (k.acilis || (k.tur !== 'bronz' && k.tur !== 'gumus')) continue;
        if (carp({ x: p.x - 3, y: p.y, w: p.w + 6, h: p.h }, k)) {
          if (this.env[k.tur]) {
            k.acilis = true; this.on.ses('kilit'); this.on.mesaj(k.tur + 'Acildi'); this.kaydet();
          }
        }
      }
      for (const i of L.ipuclari) {
        if (i.gosterildi || !carp(p, i)) continue;
        if (i.anahtar === 'ipucuBronzKapi' && this.env.bronz) continue;
        if (i.anahtar === 'ipucuGumusKapi' && this.env.gumus) continue;
        if (i.anahtar === 'ipucuYuksek' && this.env.cizme) continue;
        if (i.anahtar === 'ipucuKapaliKol' && this.kapiBul('g1').acilis) continue;
        i.gosterildi = true; this.on.mesaj(i.anahtar, { ipucu: 1 });
      }
      const b = L.bolge(p.x, p.y);
      if (b.id !== this.bolgeId) { this.bolgeId = b.id; this.on.bolge(b.id); }
      const gx = Math.floor((p.x / T) / 4), gy = Math.floor((p.y / T) / 4), gw = Math.ceil(L.W / 4);
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const q = gx + i + (gy + j) * gw;
        if (q >= 0 && q < this.gezilen.length) this.gezilen[q] = 1;
      }
    }

    // ----- Bekçi -----
    bekciAdim(p) {
      const b = this.bekci, k = this.L.bekci;
      if (b.durum === 'yok') return;
      b.t += DT; b.kanat += DT * (b.durum === 'dalis' ? 3 : 12); b.parla = Math.max(0, b.parla - DT * 3);
      const faz = 4 - b.can; // 0..3
      const merkez = () => b.x + b.w / 2;
      if (b.durum === 'uyku') {
        if (p.x > k.tetik && p.y < k.zemin + 8 && p.olu <= 0) {
          b.durum = 'uyan'; b.t = 0;
          const m = this.kapiBul('muhur'); m.acilis = false; m.acik = 0;
          this.sars = 6; this.on.ses('kukreme'); this.on.mesaj('bekciUyan', { uzun: 1 }); this.on.bekci?.(true);
        }
        return;
      }
      if (b.durum === 'uyan') {
        b.y = yaklas(b.y, k.tavan + 16, 70 * DT);
        if (b.t > 2) { b.durum = 'sal'; b.t = 0; }
      } else if (b.durum === 'sal') {
        const hedef = p.x + 5 + Math.sin(b.t * 2) * 40;
        b.x = yaklas(b.x, hedef - b.w / 2, (120 + faz * 26) * DT);
        b.y = k.tavan + 16 + Math.sin(b.t * 3) * 6;
        const sure = b.seri > 0 ? 0.45 : 1.5 - faz * 0.25;
        if (faz === 3 && Math.random() < 0.016) this.kayaDus(p);
        if (b.t > sure) { b.durum = 'isaret'; b.t = 0; b.hedefX = p.x + 5; this.on.ses('uyari'); }
      } else if (b.durum === 'isaret') {
        b.y -= 12 * DT;
        if (b.t > 0.6 - faz * 0.05) { b.durum = 'dalis'; b.t = 0; b.vy = 110; this.on.ses('dalis'); }
      } else if (b.durum === 'dalis') {
        b.vy = Math.min(b.vy + 1500 * DT, 560);
        b.y += b.vy * DT;
        if (b.y + b.h >= k.zemin) {
          b.y = k.zemin - b.h; b.durum = 'saplanma'; b.t = 0;
          this.sars = 7; this.on.ses('gumbur'); this.toz(merkez(), k.zemin, 18);
          if (faz >= 1) {
            this.mermiler.push({ tur: 'dalga', x: b.x - 6, y: k.zemin - 14, w: 10, h: 14, vx: -165, t: 0 });
            this.mermiler.push({ tur: 'dalga', x: b.x + b.w - 4, y: k.zemin - 14, w: 10, h: 14, vx: 165, t: 0 });
          }
        }
      } else if (b.durum === 'saplanma') {
        const sure = b.seri > 0 ? 0.35 : 1.75 - faz * 0.2;
        if (b.t > sure) {
          if (faz >= 2 && b.seri === 0) b.seri = 1; else b.seri = 0;
          b.durum = 'kalk'; b.t = 0;
        }
      } else if (b.durum === 'kalk') {
        b.y = yaklas(b.y, k.tavan + 16, 240 * DT);
        if (b.y <= k.tavan + 16.5) { b.durum = 'sal'; b.t = 0; }
      } else if (b.durum === 'olum') {
        b.y += 6 * DT;
        if (this.kare % 6 === 0) {
          this.on.ses('blok'); this.sars = 4;
          for (let i = 0; i < 8; i++) this.parcaEkle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, (Math.random() - 0.5) * 160, -Math.random() * 160, 0.8, ['#8a6a60', '#ff9040', '#ffd060'][i % 3], 2, 300);
        }
        if (b.t > 2.4) {
          b.durum = 'yok'; this.flash = 1; this.sars = 10; this.on.ses('gumbur');
          for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, h = 60 + Math.random() * 180; this.parcaEkle(merkez(), b.y + 20, Math.cos(a) * h, Math.sin(a) * h, 1.1, ['#ffd860', '#ff6a8a', '#70e0ff'][i % 3], 2, 260); }
          this.sayac.altin += 500;
          this.kapiBul('bekciCikis').acilis = true; this.kapiBul('muhur').acilis = true;
          this.on.mesaj('bekciOldu', { uzun: 1 }); this.on.bekci?.(false);
          this.kaydet();
        }
        return;
      }
      // temas
      if (p.olu <= 0) {
        const govde = { x: b.x + 3, y: b.y + 2, w: b.w - 6, h: b.h - 2 };
        if (b.durum === 'saplanma') {
          const kafa = { x: b.x - 2, y: b.y - 6, w: b.w + 4, h: 18 };
          if (p.vy > 0 && carp(p, kafa) && p.y + p.h < b.y + 16) this.bekciVur(b, p);
        } else if (['sal', 'isaret', 'dalis', 'kalk'].includes(b.durum) && carp(p, govde)) this.vur(p, merkez());
      }
      for (const m of this.mermiler) {
        m.t += DT;
        if (m.tur === 'dalga') { m.x += m.vx * DT; if (m.x < k.sol - 12 || m.x > k.sag + 12) m.t = 99; }
        else { m.vy = Math.min((m.vy || 0) + 520 * DT, 300); m.y += m.vy * DT; if (m.y + m.h >= k.zemin) { m.t = 99; this.toz(m.x + 5, k.zemin, 6); this.on.ses('inis'); } }
        if (m.t < 90 && p.olu <= 0 && carp(p, m)) { this.vur(p, m.x + 5); m.t = 99; }
      }
      this.mermiler = this.mermiler.filter(m => m.t < 90);
    }

    kayaDus(p) {
      const k = this.L.bekci;
      this.mermiler.push({ tur: 'kaya', x: Math.max(k.sol + 8, Math.min(k.sag - 20, p.x - 60 + Math.random() * 130)), y: k.tavan + 2, w: 11, h: 11, t: 0 });
    }

    bekciVur(b, p) {
      b.can--; b.parla = 1; b.seri = 0;
      p.vy = -300; p.kesildi = false; p.ziplama = 0;
      this.dur = 0.14; this.sars = 8; this.flash = 0.4; this.on.ses('bekciVur');
      for (let i = 0; i < 24; i++) this.parcaEkle(b.x + 17, b.y + 6, (Math.random() - 0.5) * 220, -Math.random() * 180, 0.7, ['#b09a8c', '#ffb050'][i % 2], 2, 320);
      if (b.can <= 0) {
        b.durum = 'olum'; b.t = 0; this.bekciOldu = true; this.mermiler = [];
        this.on.ses('kukreme'); this.sayac.ezilen++;
      } else { b.durum = 'kalk'; b.t = 0; }
    }

    // ----- Efektler -----
    parcaEkle(x, y, vx, vy, omur, renk, boy = 1, yer = 0) {
      if (this.parca.length > 500) return;
      this.parca.push({ x, y, vx, vy, omur, t: 0, renk, boy, yer });
    }
    toz(x, y, n) {
      for (let i = 0; i < n; i++) this.parcaEkle(x + (Math.random() - 0.5) * 8, y - 1, (Math.random() - 0.5) * 50, -Math.random() * 26, 0.4 + Math.random() * 0.3, '#8d7e6e', 1, 60);
    }
    parcalar() {
      for (const q of this.parca) { q.t += DT; q.vy += q.yer * DT; q.x += q.vx * DT; q.y += q.vy * DT; }
      if (this.parca.some(q => q.t >= q.omur)) this.parca = this.parca.filter(q => q.t < q.omur);
      for (const y of this.yazilar) { y.t -= DT; y.y -= 22 * DT; }
      if (this.yazilar.length && this.yazilar[0].t <= 0) this.yazilar.shift();
    }

    kamHedef() {
      const p = this.p, L = this.L, vw = this.gorusW, vh = this.gorusH;
      let x = p.x + 5 + p.yon * 26 - vw / 2, y = p.y - 8 - vh / 2;
      x = Math.max(0, Math.min(L.W * T - vw, x)); y = Math.max(0, Math.min(L.H * T - vh, y));
      return { x, y };
    }
    kamera() {
      const h = this.kamHedef(), k = this.kam;
      k.ox = k.x; k.oy = k.y;
      k.x += (h.x - k.x) * 0.1; k.y += (h.y - k.y) * 0.12;
    }
    kamAnlik() { const h = this.kamHedef(); Object.assign(this.kam, { x: h.x, y: h.y, ox: h.x, oy: h.y }); }

    // ----- Kayıt -----
    kaydet(son) {
      const L = this.L;
      this.on.kayit({
        v: 1, durak: this.durak, alinan: [...this.alinan], env: this.env, sayac: this.sayac, kalkan: this.kalkan, sure: this.sure,
        kapilar: L.kapilar.filter(k => k.acilis && k.tur !== 'plaka' && k.tur !== 'muhur').map(k => k.id),
        kol: L.kollar.filter(k => k.cekili && !k.anlik).map(k => k.id),
        kopru: L.kopruler.filter(b => b.acik).map(b => b.id),
        blok: L.bloklar.map(b => [b.x, b.y]),
        bekci: this.bekciOldu, gezilen: Array.from(this.gezilen).join(''), son: !!son,
      });
    }
    yukle(d) {
      this.sifirla();
      const L = this.L;
      this.durak = d.durak; this.alinan = new Set(d.alinan);
      Object.assign(this.env, d.env); Object.assign(this.sayac, d.sayac);
      this.kalkan = d.kalkan; this.sure = d.sure;
      for (const k of L.kapilar) if (d.kapilar.includes(k.id)) { k.acilis = true; k.acik = 1; }
      for (const k of L.kollar) if (d.kol.includes(k.id)) k.cekili = true;
      for (const b of L.kopruler) if (d.kopru.includes(b.id)) {
        b.acik = true; b.ilerleme = b.n;
        for (let i = 0; i < b.n; i++) L.t[b.x + i + b.y * L.W] = F.KAYA;
      }
      L.bloklar.forEach((b, i) => { if (d.blok[i]) { b.x = d.blok[i][0]; b.y = d.blok[i][1]; } });
      for (const s of L.sandiklar) if (this.alinan.has('s:' + s.id)) s.acik = true;
      if (d.bekci) { this.bekciOldu = true; this.bekci.durum = 'yok'; }
      String(d.gezilen || '').split('').forEach((c, i) => { this.gezilen[i] = +c; });
      for (const q of L.duraklar) q.yandi = q.id === d.durak;
      const q = L.duraklar[this.durak];
      this.p = this.yeniOyuncu(q.x, q.y);
      this.kamAnlik();
    }
  }
  F.Oyun = Oyun;
  F.BOS_GIRDI = BOS_GIRDI;
})();
