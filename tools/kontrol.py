"""Gerçek tarayıcı girdisi: klavye, kayıt/yükleme, dil, duraklatma, harita, telefon düzeni, kare süresi.
Kullanım: python tools/kontrol.py [çıktı klasörü]"""
import pathlib, sys, json
from playwright.sync_api import sync_playwright

KOK = pathlib.Path(__file__).resolve().parent.parent
CIKTI = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else KOK / 'tools' / 'cikti')
CIKTI.mkdir(parents=True, exist_ok=True)
URL = KOK.joinpath('index.html').as_uri()

with sync_playwright() as pw:
    t = pw.chromium.launch(channel='chrome')
    bag = t.new_context(viewport={'width': 1280, 'height': 720}, locale='tr-TR')
    s = bag.new_page()
    hatalar = []
    s.on('pageerror', lambda e: hatalar.append(str(e)))
    s.on('console', lambda m: hatalar.append(m.text) if m.type == 'error' else None)
    s.goto(URL); s.wait_for_timeout(500)
    print('başlık (tr yerel):', s.inner_text('#menu h1'), '| devam görünür:', s.is_visible('#bDevam'))
    s.click('#bBasla'); s.wait_for_timeout(200)
    x0 = s.evaluate('__fener.g.p.x')
    s.keyboard.down('ArrowRight'); s.wait_for_timeout(900); s.keyboard.down('Space'); s.wait_for_timeout(240)
    y_h = s.evaluate('__fener.g.p.y'); s.keyboard.up('Space'); s.wait_for_timeout(800); s.keyboard.up('ArrowRight'); s.wait_for_timeout(200)
    print('klavye: x', x0, '->', round(s.evaluate('__fener.g.p.x'), 1), '| havadayken y', round(y_h, 1), '| zemin y', round(s.evaluate('__fener.g.p.y'), 1))
    s.keyboard.press('Escape'); s.wait_for_timeout(100); print('duraklat:', s.is_visible('#duraklat'))
    s.screenshot(path=str(CIKTI / 'duraklat.png'))
    s.keyboard.press('Escape'); s.wait_for_timeout(100); print('sürdür:', s.evaluate('__fener.durum()'))
    s.keyboard.press('KeyM'); s.wait_for_timeout(100); print('harita:', s.is_visible('#harita'))
    s.screenshot(path=str(CIKTI / 'harita.png')); s.keyboard.press('KeyM')
    # ilerleme kurup kaydet, sayfayı yenile, devam et
    s.evaluate("""()=>{const g=__fener.g;g.env.bronz=1;g.kapiBul('bronz').acilis=true;g.sayac.gem=9;g.durak=3;g.kalkan=2;
      g.L.kollar[0].cekili=true;g.kapiBul('g1').acilis=true;g.kolCek(g.L.kollar[1]);g.alinan.add(0);g.kaydet();}""")
    s.reload(); s.wait_for_timeout(500)
    print('yenileme sonrası devam görünür:', s.is_visible('#bDevam'))
    s.click('#bDevam'); s.wait_for_timeout(300)
    print('yüklendi:', s.evaluate("""()=>{const g=__fener.g;return JSON.stringify({x:Math.round(g.p.x/16),env:g.env,gem:g.sayac.gem,kalkan:g.kalkan,bronz:g.kapiBul('bronz').acik,g1:g.kapiBul('g1').acik,kopruKaro:g.L.tile(55,54),alinan0:g.alinan.has(0)})}"""))
    # kare süresi (yazılım çizimi; en kötü durum)
    print('çizim ms/kare:', s.evaluate("""()=>{const f=__fener,t0=performance.now();for(let i=0;i<120;i++){f.g.adim(f.F.BOS_GIRDI);f.cizici.ciz(f.g,1,1/60);}return +((performance.now()-t0)/120).toFixed(2)}"""))
    s.evaluate("__fener.setDurum('menu');__fener.ekran('menu')")
    s.click('#bDil'); s.wait_for_timeout(100); print('dil değişti:', s.inner_text('#menu h1'))
    print('hatalar:', hatalar[:8])
    # telefon
    tel = t.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2)
    m = tel.new_page(); m.on('pageerror', lambda e: hatalar.append(str(e)))
    m.goto(URL + '?dil=tr'); m.wait_for_timeout(500); m.screenshot(path=str(CIKTI / 'tel_menu.png'))
    print('telefon: yatay taşma', m.evaluate('document.documentElement.scrollWidth>innerWidth'), '| dikey menü sığıyor', m.evaluate("(()=>{const e=document.getElementById('menu');return e.scrollHeight<=e.clientHeight})()"))
    m.tap('#bBasla'); m.wait_for_timeout(400)
    b = m.locator('[data-t=sag]').bounding_box()
    print('dokunmatik sağ:', b is not None)
    x0 = m.evaluate('__fener.g.p.x')
    m.evaluate("""()=>{const e=document.querySelector('[data-t=sag]');e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}""")
    m.wait_for_timeout(500)
    print('dokunma ile x:', x0, '->', round(m.evaluate('__fener.g.p.x'), 1))
    m.evaluate("""()=>{const e=document.querySelector('[data-t=sag]');e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));}""")
    m.screenshot(path=str(CIKTI / 'tel_oyun.png'))
    print('hatalar:', hatalar[:8])
    t.close()
