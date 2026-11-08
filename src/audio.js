// Tüm sesler koddan sentezlenir; dosya yok.
(() => {
  const F = window.F;
  class Ses {
    constructor() { this.ac = null; this.sesAcik = true; this.boss = false; this.sonNota = 0; }
    baslat() {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = (this.ac = new AC());
      this.ana = ac.createGain(); this.ana.gain.value = this.sesAcik ? 0.8 : 0;
      const komp = ac.createDynamicsCompressor();
      this.ana.connect(komp); komp.connect(ac.destination);
      // Taş salon yankısı: geri beslemeli gecikme
      this.yanki = ac.createGain(); this.yanki.gain.value = 0.3;
      const g1 = ac.createDelay(1), g2 = ac.createDelay(1), fb = ac.createGain(), fl = ac.createBiquadFilter();
      g1.delayTime.value = 0.23; g2.delayTime.value = 0.37; fb.gain.value = 0.42; fl.type = 'lowpass'; fl.frequency.value = 1500;
      this.yanki.connect(g1); g1.connect(fl); fl.connect(g2); g2.connect(fb); fb.connect(g1); fl.connect(this.ana); g2.connect(this.ana);
      // Yeraltı uğultusu
      this.ortam = ac.createGain(); this.ortam.gain.value = 0.13; this.ortam.connect(this.ana);
      for (const [f, tip, v] of [[55, 'sine', 0.8], [82.4, 'sine', 0.42], [110.5, 'triangle', 0.14]]) {
        const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
        o.type = tip; o.frequency.value = f; g.gain.value = v; l.frequency.value = 0.07 + f / 2000; lg.gain.value = v * 0.35;
        l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(this.ortam); o.start(); l.start();
      }
      const d = ac.sampleRate * 2, b = ac.createBuffer(1, d, ac.sampleRate), v = b.getChannelData(0);
      for (let i = 0; i < d; i++) v[i] = Math.random() * 2 - 1;
      this.gurultu = b;
      setInterval(() => this.muzikTik(), 250);
    }
    sesAyarla(a) { this.sesAcik = a; if (this.ana) this.ana.gain.value = a ? 0.8 : 0; }
    ton(f, s, tip = 'square', v = 0.14, kay = 0, gec = 0, yanki = 0.4) {
      const ac = this.ac; if (!ac) return;
      const t = ac.currentTime + gec, o = ac.createOscillator(), g = ac.createGain();
      o.type = tip; o.frequency.setValueAtTime(f, t);
      if (kay) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + kay), t + s);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + s);
      o.connect(g); g.connect(this.ana);
      if (yanki) { const y = ac.createGain(); y.gain.value = yanki; g.connect(y); y.connect(this.yanki); }
      o.start(t); o.stop(t + s + 0.02);
    }
    hisirti(s, v = 0.2, fr = 1200, gec = 0, tip = 'lowpass', kay = 0) {
      const ac = this.ac; if (!ac) return;
      const t = ac.currentTime + gec, n = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
      n.buffer = this.gurultu; n.loop = true; f.type = tip; f.frequency.setValueAtTime(fr, t);
      if (kay) f.frequency.exponentialRampToValueAtTime(Math.max(30, fr + kay), t + s);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + s);
      n.connect(f); f.connect(g); g.connect(this.ana); const y = this.ac.createGain(); y.gain.value = 0.3; g.connect(y); y.connect(this.yanki);
      n.start(t, Math.random()); n.stop(t + s + 0.02);
    }
    cal(ad) {
      if (!this.ac) return;
      const T = (...a) => this.ton(...a), H = (...a) => this.hisirti(...a);
      switch (ad) {
        case 'zipla': T(210, 0.14, 'square', 0.07, 280); break;
        case 'cift': T(420, 0.2, 'triangle', 0.14, 560); H(0.2, 0.08, 2500, 0, 'highpass'); break;
        case 'inis': H(0.07, 0.12, 500); break;
        case 'adim': H(0.04, 0.035, 900); break;
        case 'ezme': T(320, 0.1, 'square', 0.12, -230); H(0.1, 0.18, 700); T(660, 0.1, 'triangle', 0.08, 0, 0.05); break;
        case 'gem': { const n = 1040 + Math.random() * 60; T(n, 0.09, 'triangle', 0.1); T(n * 1.5, 0.16, 'triangle', 0.09, 0, 0.06); break; }
        case 'kalp': T(520, 0.12, 'sine', 0.16); T(780, 0.2, 'sine', 0.14, 0, 0.1); break;
        case 'hazine': [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.28, 'triangle', 0.11, 0, i * 0.07)); break;
        case 'anahtar': [392, 523, 659, 784, 1047, 1568].forEach((f, i) => T(f, 0.5, 'triangle', 0.12, 0, i * 0.1)); break;
        case 'kalkan': T(880, 0.3, 'sine', 0.13, 500); T(1320, 0.34, 'sine', 0.1, -500, 0.04); break;
        case 'hasar': T(200, 0.25, 'sawtooth', 0.15, -130); H(0.15, 0.2, 900); break;
        case 'olum': [330, 277, 220, 165].forEach((f, i) => T(f, 0.34, 'triangle', 0.15, 0, i * 0.15)); break;
        case 'kol': T(150, 0.05, 'square', 0.14); T(95, 0.09, 'square', 0.14, 0, 0.09); H(0.12, 0.2, 1400); break;
        case 'kapi': H(0.14, 0.09, 280); break;
        case 'kilit': T(1400, 0.05, 'square', 0.1); T(1000, 0.06, 'square', 0.1, 0, 0.09); T(110, 0.5, 'sawtooth', 0.09, -40, 0.15); break;
        case 'plaka': T(330, 0.3, 'sine', 0.16); T(495, 0.4, 'sine', 0.13, 0, 0.14); H(0.1, 0.18, 500); break;
        case 'blok': T(70, 0.2, 'sine', 0.34, -30); H(0.16, 0.28, 420); break;
        case 'surtme': H(0.18, 0.1, 340); break;
        case 'yarasa': T(1500, 0.14, 'sawtooth', 0.035, 900); T(1800, 0.1, 'sawtooth', 0.03, -700, 0.08); break;
        case 'durak': H(0.5, 0.15, 1800, 0, 'bandpass'); T(392, 0.5, 'sine', 0.13); T(587, 0.6, 'sine', 0.1, 0, 0.1); break;
        case 'kukreme': T(70, 1.3, 'sawtooth', 0.26, -30); T(52, 1.5, 'square', 0.14, 30); H(1.2, 0.2, 500); break;
        case 'uyari': T(740, 0.09, 'square', 0.09); T(740, 0.09, 'square', 0.09, 0, 0.15); break;
        case 'dalis': H(0.4, 0.24, 500, 0, 'bandpass', 2600); T(500, 0.35, 'sawtooth', 0.07, -320); break;
        case 'gumbur': T(58, 0.5, 'sine', 0.6, -30); H(0.4, 0.42, 500); break;
        case 'bekciVur': T(155, 0.18, 'square', 0.22, -90); H(0.22, 0.34, 2000); T(880, 0.22, 'triangle', 0.13, 0, 0.06); break;
        case 'zafer': [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => { T(f, 1.5, 'triangle', 0.1, 0, i * 0.14); T(f / 2, 1.5, 'sine', 0.13, 0, i * 0.14); }); break;
      }
    }
    // Seyrek, kederli pentatonik notalar; Bekçi dövüşünde davul ve bas.
    muzikTik() {
      if (!this.ac || this.ac.state !== 'running') return;
      this.tik = (this.tik || 0) + 1;
      if (this.boss) {
        const a = this.tik % 16;
        if (a % 4 === 0) { this.ton(58, 0.2, 'sine', 0.42, -25, 0, 0); this.hisirti(0.06, 0.08, 300); }
        if (a === 6 || a === 14) this.ton(58, 0.16, 'sine', 0.3, -20, 0, 0);
        const bas = [55, 55, 65.4, 49][(this.tik >> 4) % 4];
        if (a % 2 === 0) this.ton(bas, 0.22, 'sawtooth', 0.09, 0, 0, 0);
        if (a === 8) this.ton(bas * 4, 0.5, 'square', 0.035, 0);
        return;
      }
      if (this.tik % 3 === 0 && Math.random() < 0.09) { const f = 1400 + Math.random() * 1600; this.ton(f, 0.08, 'sine', 0.05, -f * 0.4, 0, 1); } // damla
      if (this.tik - this.sonNota > 10 + Math.random() * 18) {
        this.sonNota = this.tik;
        const dizi = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
        const f = dizi[Math.floor(Math.random() * dizi.length)];
        this.ton(f, 2.2, 'sine', 0.05, 0, 0, 1);
        if (Math.random() < 0.4) this.ton(f * 1.5, 2, 'sine', 0.03, 0, 0.5, 1);
      }
    }
  }
  F.ses = new Ses();
})();
