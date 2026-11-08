"""Ekran görüntüsü ve harita dökümü. Kullanım: python tools/foto.py [çıktı klasörü]"""
import sys, pathlib
from playwright.sync_api import sync_playwright

KOK = pathlib.Path(__file__).resolve().parent.parent
CIKTI = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else KOK / 'tools' / 'cikti')
CIKTI.mkdir(parents=True, exist_ok=True)
URL = KOK.joinpath('index.html').as_uri() + '?test=1&sessiz=1&dil=en'
SAHNE = {
    'giris': (10, 23, ''), 'pit': (24, 22, ''), 'salon': (72, 20, ''), 'mezar': (66, 53, ''), 'anahtar': (35, 53, ''),
    'galeri': (142, 27, ''), 'mahzen': (190, 33, ''), 'tapinak': (221, 33, ''), 'kilit': (183, 33, ''), 'hucre': (186, 22, 'c'), 'bekci': (135, 13, 'b'), 'saplanma': (150, 13, 's'), 'kasa': (188, 13, 'k'),
}

with sync_playwright() as p:
    t = p.chromium.launch(channel='chrome')
    s = t.new_page(viewport={'width': 1280, 'height': 720})
    hatalar = []
    s.on('pageerror', lambda e: hatalar.append(str(e)))
    s.on('console', lambda m: hatalar.append(m.text) if m.type == 'error' else None)
    s.goto(URL)
    s.wait_for_timeout(600)
    s.screenshot(path=str(CIKTI / 'menu.png'))
    s.evaluate("__fener.basla(true)")
    for ad, (x, y, m) in SAHNE.items():
        s.evaluate("""([x,y,m])=>{const f=__fener,g=f.g;g.tanri=true;g.dusmansiz=m!=='';const p=g.p;p.inv=0;p.x=x*16;p.y=(y+1)*16-18;p.vx=0;p.vy=0;
          if(m==='c')g.env.cizme=1;
          g.bolgeId='';for(let i=0;i<40;i++)g.adim();g.kamAnlik();
          if(m==='b'){const b=g.bekci;b.durum='isaret';b.y=g.L.bekci.tavan+16;b.t=0;b.x=p.x+70;b.can=3;}
          if(m==='s'){const b=g.bekci,z=g.L.bekci.zemin;b.durum='saplanma';b.y=z-b.h;b.t=0;b.x=p.x-70;b.can=2;g.mermiler.push({tur:'dalga',x:p.x+40,y:z-14,w:10,h:14,vx:0,t:0});}
          if(m==='k'){g.kapiBul('bekciCikis').acik=1;g.bekci.durum='yok';for(let i=0;i<4;i++)g.adim();g.kamAnlik();}
          f.hud();}""", [x, y, m])
        s.wait_for_timeout(120)
        s.screenshot(path=str(CIKTI / f'{ad}.png'))
    # tam harita: tüm dünyayı tek görsel olarak (ışıksız)
    s.evaluate("""()=>{const c=__fener.cizici,g=__fener.g,o=document.createElement('canvas');o.width=c.dunya.width/2;o.height=c.dunya.height/2;
      const x=o.getContext('2d');x.drawImage(c.dunya,0,0,o.width,o.height);window.__dok=o.toDataURL('image/png');}""")
    import base64
    d = s.evaluate("__dok").split(',')[1]
    (CIKTI / 'dunya.png').write_bytes(base64.b64decode(d))
    print('hatalar:', hatalar[:10])
    t.close()
