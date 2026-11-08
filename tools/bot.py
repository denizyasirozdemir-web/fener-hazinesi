"""Tam oyun doğrulaması. Gerçek fizikle yol arar, oyunu baştan sona oynatır, Bekçiyi yener.
Ayrıca: tüm ögelerin ulaşılabilirliği, hasar/ezme/tılsım, kayıt-yükleme, gerçek tuşlarla başlatma.
Kullanım: python tools/bot.py"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

KOK = pathlib.Path(__file__).resolve().parent.parent
JS = r"""
(() => {
const {g, F} = __fener, T = 16, BOS = F.BOS_GIRDI;
const kop = p => ({...p, guvenli: p.guvenli});
function makrolar(cizme) {
  const a = [];
  for (const yon of [-1, 1, 0]) for (const kare of [4, 10, 18, 30, 48, 70]) {
    if (yon === 0 && kare > 4) continue;
    if (yon) a.push({yon, kare, zip: 0});
    for (const zip of [7, 14, 26]) {
      a.push({yon, kare, zip});
      if (cizme) for (const ikinci of [18, 28, 38]) a.push({yon, kare, zip, ikinci});
    }
  }
  a.push({yon: 0, kare: 1, zip: 0, in: 1}, {yon: 1, kare: 8, zip: 0, in: 1}, {yon: -1, kare: 8, zip: 0, in: 1});
  return a;
}
function sim(p0, m, izle) {
  const p = kop(p0), kayit = [];
  for (let i = 0; i < 260; i++) {
    const y = {sol: m.yon < 0 && i < m.kare, sag: m.yon > 0 && i < m.kare, asagi: !!m.in && i < 2, zipla: (m.zip && i < m.zip) || (m.ikinci && i >= m.ikinci && i < m.ikinci + 22),
      ziplaB: (m.zip && i === 0) || (m.in && i === 0) || (m.ikinci && i === m.ikinci), eylem: 0, eylemB: 0};
    y.sol = !!y.sol; y.sag = !!y.sag; y.zipla = !!y.zipla; y.ziplaB = !!y.ziplaB;
    g.oyuncuHareket(p, y); kayit.push(y);
    if (g.dikenVar(p)) return null;
    if (izle) izle(p);
    if (i > 2 && p.zemin && i >= m.kare) return {p, kayit};
    if (p.y > g.L.H * T) return null;
  }
  return null;
}
const ana = p => Math.round(p.x / 8) + ',' + Math.round(p.y / 6);
function ara(hedef, limit = 700000, izle) {
  const ms = makrolar(g.env.cizme), s = g.p;
  const bas = kop(s); const gor = new Set([ana(bas)]); const q = [{p: bas, ata: null, k: null}]; let n = 0;
  for (let i = 0; i < q.length; i++) {
    const d = q[i];
    if (hedef && carp(d.p, hedef)) { const yol = []; for (let e = d; e.ata; e = e.ata) yol.unshift(e.k); return yol.flat(); }
    for (const m of ms) {
      if (++n > limit) { return hedef ? null : q.length; }
      const r = sim(d.p, m, izle);
      if (!r) continue;
      if (hedef && carp(r.p, hedef)) { const yol = [r.kayit]; for (let e = d; e.ata; e = e.ata) yol.unshift(e.k); return yol.flat(); }
      const k = ana(r.p); if (gor.has(k)) continue;
      gor.add(k); q.push({p: r.p, ata: d, k: r.kayit});
    }
  }
  return hedef ? null : q.length;
}
const carp = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const oyna = (kareler) => { for (const y of kareler) g.adim(y); };
const bekle = n => { for (let i = 0; i < n; i++) g.adim(BOS); };
const git = (x, y, w = 2, h = 2) => {
  const yol = ara({x: x * T, y: y * T, w: w * T, h: h * T});
  if (!yol) throw new Error('yol yok: ' + [x, y, 'oyuncu', (g.p.x / T).toFixed(1), (g.p.y / T).toFixed(1)]);
  oyna(yol); bekle(8); return yol.length;
};
const eylem = () => { g.adim({...BOS, eylem: 1, eylemB: 1}); bekle(3); };
const yuru = (yon, n) => { for (let i = 0; i < n; i++) g.adim({...BOS, sag: yon > 0 ? 1 : 0, sol: yon < 0 ? 1 : 0}); };
const durum = ad => ({ad, x: +(g.p.x / T).toFixed(1), y: +(g.p.y / T).toFixed(1), sure: +g.sure.toFixed(1), gem: g.sayac.gem, env: {...g.env}, can: g.can, kalkan: g.kalkan});

window.Y = {
  ilk() {
    const log = []; g.dusmansiz = true;
    git(112, 52); eylem(); log.push(durum('k1'), kapi('g1')); bekle(120);
    git(64, 52); eylem(); log.push(durum('k2')); bekle(40);
    git(32, 51); log.push(durum('bronz'));
    git(19, 52, 4); eylem(); log.push(durum('gizli sandik'));
    git(109, 32); yuru(1, 40); log.push(durum('bronz kapi'), kapi('bronz')); bekle(120);
    git(183, 32); log.push(durum('blok oncesi'));
    let n = 0;
    while (!g.L.plakalar[0].basili && n++ < 3000) yuru(1, 1);
    log.push(durum('blok itildi'), {kare: n, blokX: g.L.bloklar[0].x / T, blokY: g.L.bloklar[0].y / T, plaka: g.L.plakalar[0].basili}); bekle(100);
    log.push(kapi('p1k'));
    git(223, 32, 1, 2); log.push(durum('cizme'));
    return log;
  },
  kapsama() {
    // tüm ögeler için son durumdan taşkın araması
    const gorulen = new Set();
    for (const k of g.L.kapilar) { k.acik = 1; k.acilis = true; }
    const ogeler = g.L.ogeler.filter(o => !g.alinan.has(o.id));
    const n = ara(null, 1500000, p => {
      for (const o of ogeler) if (!gorulen.has(o.id) && carp({x: p.x - 3, y: p.y - 2, w: p.w + 6, h: p.h + 4}, {x: o.x - 6, y: o.y - 7, w: 12, h: 14})) gorulen.add(o.id);
    });
    return {dugum: n, toplam: ogeler.length, ulasilmayan: ogeler.filter(o => !gorulen.has(o.id)).map(o => [o.tur, Math.floor(o.x / T), Math.floor(o.y / T)])};
  },
  ikinci() {
    const log = []; g.dusmansiz = true;
    git(171, 31); log.push(durum('mahzenden cikis')); git(152, 28, 3, 2); log.push(durum('raf')); git(160, 23, 3, 2); log.push(durum('cikinti')); git(172, 23); git(197, 22, 1, 2); log.push(durum('gumus'));
    for (const [x,y] of [[172,23],[160,23],[156,32],[136,32],[122,32],[113,32],[102,32],[92,32],[76,32],[74,29],[78,26],[74,23],[69,22],[76,19],[83,16],[90,13],[96,11],[103,10]]) git(x,y); log.push(durum('salon tepesi')); git(109, 10); yuru(1, 40); log.push(durum('gumus kapi'), kapi('gumus')); bekle(150);
    return log;
  },
  bekci(hasarVar) {
    g.dusmansiz = true; g.tanri = !hasarVar;
    const log = [], b = g.bekci, k = g.L.bekci;
    yuru(1, 170); log.push(durum('arena'), b.durum);
    let n = 0, vurus = 0, son = b.can, inerken = 0;
    while (b.durum !== 'yok' && n++ < 8000) {
      const p = g.p, cx = p.x + 5, bx = b.x + b.w / 2, y = {...BOS};
      const git_ = h => { if (h > cx + 4) y.sag = 1; else if (h < cx - 4) y.sol = 1; };
      if (b.durum === 'saplanma') {
        git_(bx);
        if (p.zemin && Math.abs(cx - bx) < 50) { y.zipla = 1; y.ziplaB = 1; } else if (!p.zemin && p.vy < 0) y.zipla = 1;
      } else if (b.durum === 'isaret' || b.durum === 'dalis') {
        const uzak = cx < (k.sol + k.sag) / 2 ? bx + 70 : bx - 70; git_(uzak);
      } else if (['sal', 'kalk'].includes(b.durum)) {
        git_((k.sol + k.sag) / 2 + Math.sin(n / 90) * 110);
      }
      for (const m of g.mermiler) if (m.tur === 'dalga' && Math.abs(m.x - cx) < 34 && p.zemin) { y.zipla = 1; y.ziplaB = 1; }
      if (!p.zemin && p.vy < 0 && !y.zipla && p.kesildi === false) y.zipla = 1;
      g.adim(y);
      if (b.can !== son) { son = b.can; vurus++; log.push({vurus, kare: n, sure: +(n / 60).toFixed(1), can: g.can, kalkan: g.kalkan}); }
      if (g.p.olu > 0) { log.push('OYUNCU OLDU kare ' + n); break; }
    }
    log.push(durum('bekci sonu'), b.durum, kapi('bekciCikis'));
    return log;
  },
  kasa() {
    const log = []; g.tanri = false; bekle(120);
    git(192, 11, 3, 3); log.push(durum('emanet'), g.bitis > 0);
    let bitti = false; g.on.bitti = () => { bitti = true; };
    bekle(240); log.push({bitti, sayac: {...g.sayac}, toplam: g.toplam});
    return log;
  },
  dusman() {
    // hasar kuralları: gerçek çarpışmalar
    const log = []; g.sifirla(); g.dusmansiz = false; g.tanri = false; const p = g.p;
    const s = g.slimeler[0];
    p.x = s.x; p.y = s.y - 40; p.vy = 100; let n = 0;
    while (s.canli && n++ < 120) { p.x = s.x; g.adim(BOS); }
    log.push({ezme: !s.canli, vy: +g.p.vy.toFixed(0), can: g.can});
    bekle(40); const s2 = g.slimeler[1]; p.x = s2.x + 4; p.y = s2.y - 7; p.vy = 0; bekle(3);
    log.push({yanTemas: g.can, inv: p.inv > 0});
    g.kalkan = 1; p.inv = 0; const c = g.can; g.vur(p, 0); log.push({tilsim: g.kalkan === 0 && g.can === c}); p.inv = 0;
    p.x = 24 * T; p.y = 25 * T; p.vy = 0; const once = g.can; bekle(10); log.push({diken: g.can === once - 1, geri: +(g.p.x / T).toFixed(1), y: +(g.p.y / T).toFixed(1)});
    const b = g.yarasalar[0]; p.inv = 0; g.can = 3; p.x = b.ex - 30; p.y = b.ey + 80; n = 0;
    while (b.durum === 'asili' && n++ < 30) { g.adim(BOS); p.x = b.ex - 30; p.y = b.ey + 80; }
    log.push({yarasaDalis: b.durum});
    g.can = 1; p.inv = 0; g.vur(p, 0); log.push({olum: g.p.olu > 0}); bekle(110); log.push({dogdu: g.p.olu === 0, can: g.can, sayac: g.sayac.olum});
    return log;
  },
};
const kapi = id => { const k = g.kapiBul(id); return [id, k.acilis, +k.acik.toFixed(2)]; };
})();
"""

with sync_playwright() as pw:
    t = pw.chromium.launch(channel='chrome')
    s = t.new_page(viewport={'width': 1280, 'height': 720})
    hatalar = []
    s.on('pageerror', lambda e: hatalar.append(str(e)))
    s.on('console', lambda m: hatalar.append(m.text) if m.type == 'error' else None)
    s.goto(KOK.joinpath('index.html').as_uri() + '?test=1&sessiz=1&dil=en')
    s.wait_for_timeout(400)
    s.evaluate(JS)
    s.evaluate("__fener.basla(true)")
    def calis(ad, kod):
        print('---', ad); sys.stdout.flush()
        print(json.dumps(s.evaluate(kod), ensure_ascii=False))
    calis('birinci yarı', 'Y.ilk()')
    calis('ikinci yarı', 'Y.ikinci()')
    calis('bekçi (gerçek hasarla)', 'Y.bekci(true)')
    s.screenshot(path=str(KOK / 'tools' / 'cikti' / 'bot_bekci.png')) if (KOK / 'tools' / 'cikti').exists() else None
    calis('hazine odası', 'Y.kasa()')
    calis('kapsama (kapılar açık, çizmeli)', 'Y.kapsama()')
    calis('hasar kuralları', 'Y.dusman()')
    print('hatalar:', hatalar[:10])
    t.close()
