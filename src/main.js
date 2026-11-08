// Döngü, girdi, arayüz ve kayıt.
(() => {
  const F = window.F, $ = id => document.getElementById(id);
  const KAYIT = 'fener-hazinesi-kayit-v1', AYAR = 'fener-hazinesi-ayar-v1';
  const oku = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const yaz = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* gizli sekme */ } };

  const q = new URLSearchParams(location.search);
  const ayar = oku(AYAR) || {};
  let dil = q.get('dil') || ayar.dil || ((navigator.language || 'en').startsWith('tr') ? 'tr' : 'en');
  let sesAcik = ayar.ses !== false && !q.has('sessiz');
  const M = (k, v) => { let s = F.METIN[dil][k] ?? k; if (v) for (const a in v) s = s.replace('{' + a + '}', v[a]); return s; };

  const cv = $('oyun');
  const cizici = new F.Cizici(cv);
  const g = new F.Oyun();
  cizici.hazirla(g.L);
  let durum = 'menu'; // menu | oyun | durak | harita | son
  const testModu = q.has('test');
  if (q.has('tanri')) g.tanri = true;

  // ----- Boyut -----
  function boyutla() {
    const W = innerWidth, H = innerHeight, ic = 270;
    const en = Math.max(360, Math.min(640, Math.round(ic * (W / H))));
    cizici.boyut(g, en, ic);
    const o = Math.min(W / en, H / ic);
    cv.style.width = Math.floor(en * o) + 'px'; cv.style.height = Math.floor(ic * o) + 'px';
  }
  addEventListener('resize', boyutla); boyutla();

  // ----- Girdi -----
  const basili = new Set(), gir = { ...F.BOS_GIRDI };
  const SOL = ['ArrowLeft', 'KeyA'], SAG = ['ArrowRight', 'KeyD'], ZIP = ['Space', 'KeyW', 'ArrowUp', 'KeyZ'], ASG = ['ArrowDown', 'KeyS'], EYL = ['KeyE', 'KeyX', 'Enter'];
  let ziplaOnce = false, eylemOnce = false, dokun = { sol: 0, sag: 0, zipla: 0, eylem: 0, asagi: 0 };
  addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    F.ses.baslat();
    basili.add(e.code);
    if (e.code === 'Escape') { if (durum === 'oyun') duraklat(); else if (durum === 'durak') surdur(); else if (durum === 'harita') haritaKapat(); }
    if (e.code === 'KeyM') { if (durum === 'oyun') haritaAc(); else if (durum === 'harita') haritaKapat(); }
  });
  addEventListener('keyup', e => basili.delete(e.code));
  addEventListener('blur', () => { basili.clear(); if (durum === 'oyun' && !testModu) duraklat(); });
  const herhangi = l => l.some(k => basili.has(k));
  function girdiOku() {
    let gp = null;
    try { gp = navigator.getGamepads && [...navigator.getGamepads()].find(Boolean); } catch { /* yok */ }
    const eks = gp ? gp.axes[0] || 0 : 0, b = i => !!(gp && gp.buttons[i] && gp.buttons[i].pressed);
    gir.sol = herhangi(SOL) || dokun.sol || eks < -0.35 || b(14);
    gir.sag = herhangi(SAG) || dokun.sag || eks > 0.35 || b(15);
    gir.asagi = herhangi(ASG) || dokun.asagi || b(13);
    const z = herhangi(ZIP) || dokun.zipla || b(0), e = herhangi(EYL) || dokun.eylem || b(2);
    gir.zipla = z; gir.ziplaB = z && !ziplaOnce; ziplaOnce = z;
    gir.eylem = e; gir.eylemB = e && !eylemOnce; eylemOnce = e;
    return gir;
  }
  document.querySelectorAll('[data-t]').forEach(el => {
    const k = el.dataset.t;
    const bas = v => e => { e.preventDefault(); dokun[k] = v; F.ses.baslat(); el.classList.toggle('bas', !!v); };
    el.addEventListener('pointerdown', bas(1)); el.addEventListener('pointerup', bas(0)); el.addEventListener('pointercancel', bas(0)); el.addEventListener('pointerleave', bas(0));
  });
  if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('dokunmatik');

  // ----- HUD -----
  const kalplerEl = $('kalpler'), tilsimEl = $('tilsimlar'), envEl = $('envanter');
  let hudKey = '';
  function hud() {
    const s = g.sayac;
    const k = [g.can, g.canMax, g.kalkan, g.env.bronz, g.env.gumus, g.env.cizme].join();
    if (k !== hudKey) {
      hudKey = k;
      kalplerEl.replaceChildren(...Array.from({ length: g.canMax }, (_, i) => F.ikonTuval(i < g.can ? 'kalp' : 'kalpBos')));
      tilsimEl.replaceChildren(...Array.from({ length: g.kalkan }, () => F.ikonTuval('tilsim')));
      const e = [];
      if (g.env.bronz) e.push(F.ikonTuval('anahtar', 'bronz'));
      if (g.env.gumus) e.push(F.ikonTuval('anahtar', 'gumus'));
      if (g.env.cizme) e.push(F.ikonTuval('cizme'));
      envEl.replaceChildren(...e);
    }
    $('sGem').textContent = s.gem; $('sHazine').textContent = `${s.hazine}/${g.toplam.hazine}`; $('sAltin').textContent = s.altin;
    const b = g.bekci;
    const goster = ['uyan', 'sal', 'isaret', 'dalis', 'saplanma', 'kalk'].includes(b.durum);
    $('bekciCubuk').classList.toggle('gor', goster);
    $('bekciDolu').style.width = (b.can / 4) * 100 + '%';
  }
  $('ikGem').append(F.ikonTuval('gem', 0)); $('ikHazine').append(F.ikonTuval('hazineSay'));

  let msgT = null;
  function mesaj(an, v = {}) {
    const el = $('mesaj');
    el.textContent = M(an, v);
    el.className = 'gor' + (v.ipucu ? ' ipucu' : '') + (v.uzun ? ' uzun' : '');
    clearTimeout(msgT);
    msgT = setTimeout(() => el.classList.remove('gor'), v.uzun ? 5200 : v.ipucu ? 4800 : 2600);
  }
  let bolT = null, sonBolge = '';
  function bolge(id) {
    if (id === sonBolge) return;
    sonBolge = id;
    const el = $('bolge');
    el.textContent = M('b_' + id);
    el.classList.add('gor');
    clearTimeout(bolT);
    bolT = setTimeout(() => el.classList.remove('gor'), 2800);
  }

  g.on = {
    ses: n => F.ses.cal(n),
    mesaj, bolge,
    kayit: d => yaz(KAYIT, d),
    bekci: a => { F.ses.boss = a; },
    bitti: () => bitir(),
  };

  // ----- Ekranlar -----
  function metinler() {
    document.documentElement.lang = dil;
    document.title = M('baslik');
    document.querySelectorAll('[data-m]').forEach(el => { el.innerHTML = M(el.dataset.m); });
    $('bDil').textContent = M('dil');
    for (const id of ['bSes', 'bSes2']) $(id).textContent = M(sesAcik ? 'sesAc' : 'sesKapa');
    const kayit = oku(KAYIT);
    $('bDevam').hidden = !kayit || kayit.son;
  }
  const ekran = id => document.querySelectorAll('.ekran').forEach(e => e.classList.toggle('gor', e.id === id));
  function basla(yeni) {
    F.ses.baslat(); F.ses.sesAyarla(sesAcik);
    if (yeni) { yaz(KAYIT, null); g.sifirla(); g.bittiBildirildi = false; } else { const d = oku(KAYIT); if (d) { try { g.yukle(d); } catch (e) { console.error(e); g.sifirla(); } } }
    F.ses.boss = false; sonBolge = ''; g.bolgeId = ''; hudKey = '';
    durum = 'oyun'; ekran(''); $('hud').classList.add('gor');
    if (document.activeElement) document.activeElement.blur();
  }
  function duraklat() { durum = 'durak'; ekran('duraklat'); }
  function surdur() { durum = 'oyun'; ekran(''); }
  function haritaAc() { durum = 'harita'; cizici.harita(g, $('haritaTuval')); ekran('harita'); }
  function haritaKapat() { durum = 'oyun'; ekran(''); }
  function menu() { durum = 'menu'; $('hud').classList.remove('gor'); F.ses.boss = false; metinler(); ekran('menu'); }
  function bitir() {
    durum = 'son'; $('hud').classList.remove('gor'); F.ses.boss = false;
    const s = g.sayac, dk = Math.floor(g.sure / 60), sn = Math.floor(g.sure % 60);
    const puan = s.gem / g.toplam.gem + s.hazine / g.toplam.hazine + s.tilsim / g.toplam.tilsim;
    const rutbe = puan >= 2.6 && s.olum <= 3 ? 'r2' : puan >= 1.6 ? 'r1' : 'r0';
    const satir = (a, b) => `<div><span>${M(a)}</span><b>${b}</b></div>`;
    $('sonuc').innerHTML = satir('sure', `${dk}:${String(sn).padStart(2, '0')}`) + satir('gemler', `${s.gem} / ${g.toplam.gem}`) + satir('hazineler', `${s.hazine} / ${g.toplam.hazine}`) +
      satir('tilsimlar', `${s.tilsim} / ${g.toplam.tilsim}`) + satir('olumler', s.olum) + satir('altin', s.altin) + `<div class="rutbe"><span>${M('rutbe')}</span><b>${M(rutbe)}</b></div>`;
    ekran('son'); metinler();
  }

  $('bBasla').onclick = () => { if (oku(KAYIT) && !oku(KAYIT).son) ekran('onay'); else basla(true); };
  $('bEvet').onclick = () => basla(true); $('bHayir').onclick = () => ekran('menu');
  $('bDevam').onclick = () => basla(false);
  $('bSurdur').onclick = surdur; $('bAna').onclick = () => { g.kaydet(); menu(); }; $('bTekrar').onclick = () => { yaz(KAYIT, null); menu(); };
  $('bDil').onclick = () => { dil = dil === 'tr' ? 'en' : 'tr'; yaz(AYAR, { dil, ses: sesAcik }); metinler(); };
  const sesTus = () => { sesAcik = !sesAcik; F.ses.baslat(); F.ses.sesAyarla(sesAcik); yaz(AYAR, { dil, ses: sesAcik }); metinler(); };
  $('bSes').onclick = sesTus; $('bSes2').onclick = sesTus;
  $('bHarita').onclick = haritaAc; $('dPause').onclick = () => { if (durum === 'oyun') duraklat(); };

  // ----- Döngü -----
  let son = 0, birikim = 0;
  function kare(t) {
    const dt = Math.min((t - son) / 1000 || 0, 0.1); son = t;
    if (durum === 'oyun' && !testModu) {
      birikim += dt;
      while (birikim >= F.DT) { g.adim(girdiOku()); birikim -= F.DT; }
      hud();
    }
    cizici.ciz(g, durum === 'oyun' ? birikim / F.DT : 1, dt);
    requestAnimationFrame(kare);
  }
  metinler();
  ekran('menu');
  requestAnimationFrame(kare);
  $('yukleme').remove();

  window.__fener = { g, F, cizici, basla, hud, mesaj, M, ekran, durum: () => durum, setDurum: d => { durum = d; } };
})();
