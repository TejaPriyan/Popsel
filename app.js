/**
 * Pixel Studio 2026 - Audio-Reactive Pixel Reveal Studio
 * High-performance Canvas 2D engine with procedural Web Audio ASMR synthesis,
 * multi-aspect ratio rendering, and 60 FPS video export.
 */

// Helper utility
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ============================================================================
// 1. PROCEDURAL WEB AUDIO ASMR ENGINE
// ============================================================================
class PopSoundEngine {
  constructor() {
    this.ctx = null;
    this.dest = null;
    this.masterGain = null;
    this.analyser = null;
    this.freqData = null;
    this.enabled = true;
    this.volume = 0.6;
    this.soundType = 'bubble';
    this.lastPopTime = 0;
    this.minInterval = 0.038; // Up to ~26 satisfying pops per second max to prevent cacophony
    this.beatTimer = null;
    this.customBuffer = null;
    this.customSource = null;
    this.mode = 'asmr'; // 'asmr', 'synthwave', 'lofi', 'custom'
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    
    // Create MediaStream destination for recording audio into video
    this.dest = this.ctx.createMediaStreamDestination();
    
    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Analyser for real-time Beat-Sync FFT
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Connect master gain to both speaker destination, recording stream, and analyser
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.dest);
    this.masterGain.connect(this.analyser);
  }

  getAudioEnergy() {
    if (!this.analyser || !this.freqData) return { bass: 0 };
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += this.freqData[i] || 0;
    return { bass: sum / (4 * 255) };
  }

  startBeats(style = 'synthwave') {
    this.stopBeats();
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.mode = style;
    const bpm = style === 'lofi' ? 82 : 120;
    const intervalMs = (60 / bpm) * 1000 / 4; // 16th notes
    let step = 0;

    const synthBassNotes = [55, 55, 65.4, 55, 73.4, 65.4, 49, 52];

    this.beatTimer = setInterval(() => {
      if (isPaused || !this.enabled) return;
      const now = this.ctx.currentTime;
      const beat16 = step % 16;

      // Kick drum
      if (style === 'synthwave' && (beat16 === 0 || beat16 === 4 || beat16 === 8 || beat16 === 12)) {
        this._playKick(now);
      } else if (style === 'lofi' && (beat16 === 0 || beat16 === 6 || beat16 === 10)) {
        this._playKick(now);
      }

      // Snare / Clap
      if (beat16 === 4 || beat16 === 12) {
        this._playSnare(now);
      }

      // Hi-Hat
      if (beat16 % 2 === 0) {
        this._playHiHat(now, beat16 % 4 === 2);
      }

      // Synth Bassline (in Synthwave mode)
      if (style === 'synthwave' && beat16 % 2 === 0) {
        const noteIdx = (step >> 1) % synthBassNotes.length;
        this._playSynthBass(now, synthBassNotes[noteIdx]);
      }

      step++;
    }, intervalMs);
  }

  stopBeats() {
    if (this.beatTimer) {
      clearInterval(this.beatTimer);
      this.beatTimer = null;
    }
    if (this.customSource) {
      try { this.customSource.stop(); } catch (_) {}
      this.customSource = null;
    }
  }

  async loadCustomAudio(file) {
    this.stopBeats();
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.mode = 'custom';
    const arrayBuf = await file.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arrayBuf);
    this.customBuffer = decoded;
    this.playCustomAudio();
  }

  playCustomAudio() {
    if (!this.customBuffer || !this.ctx) return;
    if (this.customSource) {
      try { this.customSource.stop(); } catch (_) {}
    }
    this.customSource = this.ctx.createBufferSource();
    this.customSource.buffer = this.customBuffer;
    this.customSource.loop = true;
    this.customSource.connect(this.masterGain);
    this.customSource.start(0);
  }

  _playKick(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.18);
    gain.gain.setValueAtTime(0.85 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  _playSnare(now) {
    const bufSize = Math.floor(this.ctx.sampleRate * 0.14);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1350;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.48 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.16);
  }

  _playHiHat(now, accent = false) {
    const bufSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((accent ? 0.32 : 0.16) * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.045);
  }

  _playSynthBass(now, freq) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(170, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  triggerPop(pitchNorm = 0.5) {
    if (!this.enabled) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    if (now - this.lastPopTime < this.minInterval) return;
    this.lastPopTime = now;

    switch (this.soundType) {
      case 'retro':
        this._playRetroBlip(now, pitchNorm);
        break;
      case 'woodblock':
        this._playWoodblock(now, pitchNorm);
        break;
      case 'water':
        this._playWaterDrop(now, pitchNorm);
        break;
      case 'click':
        this._playClick(now, pitchNorm);
        break;
      case 'bubble':
      default:
        this._playBubblePop(now, pitchNorm);
        break;
    }
  }

  _playBubblePop(now, pitchNorm) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const baseFreq = 260 + pitchNorm * 380; // 260Hz - 640Hz

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.05);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  _playRetroBlip(now, pitchNorm) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 350 + Math.floor(pitchNorm * 8) * 75;

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.setValueAtTime(freq * 1.5, now + 0.02);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.055);
  }

  _playWoodblock(now, pitchNorm) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500 + pitchNorm * 400, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + pitchNorm * 500, now);
    filter.Q.value = 6.0;

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  _playWaterDrop(now, pitchNorm) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 600 + pitchNorm * 600;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 0.04);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  _playClick(now, pitchNorm) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400 + pitchNorm * 800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }
}

const audio = new PopSoundEngine();

// ============================================================================
// 2. CANVAS & DIMENSIONS ENGINE
// ============================================================================
const stageFrame = $('#stage-frame');
const cv = $('#stage');
const cx = cv.getContext('2d', { alpha: false });

// Offscreen source canvas for pixel sampling
const src = document.createElement('canvas');
const sx = src.getContext('2d', { willReadFrequently: true });

// Aspect Ratio dimensions map
const RATIOS = {
  '9:16': { w: 720, h: 1280, css: 'ratio-9-16' },
  '1:1':  { w: 720, h: 720,  css: 'ratio-1-1' },
  '4:5':  { w: 720, h: 900,  css: 'ratio-4-5' },
  '16:9': { w: 1280, h: 720, css: 'ratio-16-9' }
};

let currentRatioKey = '1:1';
let W = 720, H = 720;

function setAspectRatio(key) {
  if (!RATIOS[key]) return;
  currentRatioKey = key;
  const config = RATIOS[key];
  W = config.w;
  H = config.h;

  cv.width = W;
  cv.height = H;
  src.width = W;
  src.height = H;

  // Update CSS classes
  Object.values(RATIOS).forEach(r => stageFrame.classList.remove(r.css));
  stageFrame.classList.add(config.css);

  $$('.aspect-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ratio === key);
  });

  // Re-fit current image or demo art
  if (curImg) fitImage(curImg);
  else renderDemoArtwork();
}

// UI Controls mapping
const ui = {
  pattern: $('#pattern'),
  shape: $('#shape'),
  cell: $('#cell'),
  dur: $('#dur'),
  pop: $('#pop'),
  elastic: $('#elastic'),
  bg: $('#bg'),
  fitMode: $('#fit-mode'),
  soundVol: $('#sound-vol'),
  soundStyle: $('#sound-style')
};

// State variables
let P = [];                  // Particles array: [x, y, r, g, b, delay, pitchNorm]
let T = 0;                  // Current animation playback time (ms)
let totalDuration = 10000;  // Total duration (ms)
let origin = [0.5, 0.5];    // Ripple epicenter (normalized 0 to 1)
let recorder = null;        // MediaRecorder instance
let lastFrameTime = 0;      // Last RAF timestamp
let curImg = null;          // Currently loaded Image object
let slides = [];            // Slideshow images array
let slideIdx = 0;           // Current slide index
let isPaused = false;       // Playback pause state
let currentPreset = 'original'; // Active color preset

// Easing formula: Elastic overshoot
function easeOvershoot(t, s = 1.70158) {
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

// ============================================================================
// 3. COLOR PALETTES & PRESET FILTERS
// ============================================================================
const GAMEBOY_PALETTE = [
  [15, 56, 15],     // Darkest green
  [48, 98, 48],
  [139, 172, 15],
  [155, 188, 15]    // Lightest green
];

function applyPresetColor(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const nLum = lum / 255;

  switch (currentPreset) {
    case 'cyberpunk': {
      // Midnight violet to neon magenta to electric cyan
      if (nLum < 0.35) {
        const f = nLum / 0.35;
        return [Math.round(15 + f * 50), Math.round(10 + f * 10), Math.round(45 + f * 90)];
      } else if (nLum < 0.7) {
        const f = (nLum - 0.35) / 0.35;
        return [Math.round(65 + f * 190), Math.round(20 + f * 20), Math.round(135 + f * 90)];
      } else {
        const f = (nLum - 0.7) / 0.3;
        return [Math.round(255 * (1 - f * 0.9)), Math.round(40 + f * 205), Math.round(225 + f * 20)];
      }
    }
    case 'gameboy': {
      const idx = Math.min(3, Math.floor(nLum * 4));
      return GAMEBOY_PALETTE[idx];
    }
    case 'lofi': {
      // Warm amber, sepia, dusty sunset
      const cr = Math.min(255, lum * 1.15 + 35);
      const cg = Math.min(255, lum * 0.9 + 15);
      const cb = Math.min(255, lum * 0.65 + 10);
      return [cr | 0, cg | 0, cb | 0];
    }
    case 'noir': {
      // Cinematic high contrast monochrome
      const c = Math.min(255, Math.max(0, Math.pow(nLum, 1.4) * 255)) | 0;
      return [c, c, c];
    }
    case 'vaporwave': {
      // Pastel cyan, soft pink, lavender
      const cr = Math.min(255, Math.round(255 * Math.sin(nLum * Math.PI * 0.5)));
      const cg = Math.min(255, Math.round(180 + nLum * 60));
      const cb = Math.min(255, Math.round(220 + nLum * 35));
      return [cr, cg, cb];
    }
    case 'original':
    default:
      // Slight vibrancy pop
      return [
        Math.min(255, r * 1.18) | 0,
        Math.min(255, g * 1.18) | 0,
        Math.min(255, b * 1.18) | 0
      ];
  }
}

// ============================================================================
// 4. IMAGE HANDLING & SMART FRAMING
// ============================================================================
function loadSampleImage(url = 'sample1.jpg') {
  const img = new Image();
  img.onload = () => {
    fitImage(img);
  };
  img.onerror = () => {
    renderDemoArtwork();
  };
  img.src = url;
}

function drawProceduralArt(c) {
  // Vibrant multi-stop sky gradient
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2e0854');
  g.addColorStop(0.35, '#ff007f');
  g.addColorStop(0.65, '#ff9e00');
  g.addColorStop(0.85, '#00f5d4');
  g.addColorStop(1, '#1a0033');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // Distant twinkling stars
  c.fillStyle = '#ffffff';
  for (let s = 0; s < 45; s++) {
    const sx = ((s * 137.5) % W);
    const sy = ((s * 73.1) % (H * 0.45));
    c.fillRect(sx, sy, 2, 2);
  }

  // Giant glowing retro sun
  const sunRadius = Math.min(W, H) * 0.22;
  const sunX = W * 0.5;
  const sunY = H * 0.42;
  const sunG = c.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius);
  sunG.addColorStop(0, '#ffffff');
  sunG.addColorStop(0.5, '#ffd23f');
  sunG.addColorStop(1, '#ff3366');
  c.fillStyle = sunG;
  c.beginPath();
  c.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  c.fill();

  // Cyberpunk mountain ridges
  c.fillStyle = '#480ca8';
  c.beginPath();
  c.moveTo(0, H);
  c.lineTo(0, H * 0.62);
  c.lineTo(W * 0.25, H * 0.46);
  c.lineTo(W * 0.5, H * 0.68);
  c.lineTo(W * 0.78, H * 0.5);
  c.lineTo(W, H * 0.65);
  c.lineTo(W, H);
  c.fill();

  // Foreground Neon City Silhouette with illuminated windows
  c.fillStyle = '#10002b';
  const buildings = [
    [0, H * 0.7, W * 0.14],
    [W * 0.12, H * 0.62, W * 0.12],
    [W * 0.23, H * 0.75, W * 0.11],
    [W * 0.33, H * 0.56, W * 0.14],
    [W * 0.46, H * 0.68, W * 0.1],
    [W * 0.55, H * 0.58, W * 0.13],
    [W * 0.67, H * 0.72, W * 0.12],
    [W * 0.78, H * 0.64, W * 0.12],
    [W * 0.89, H * 0.69, W * 0.12]
  ];
  buildings.forEach(([bx, by, bw]) => {
    c.fillRect(bx, by, bw, H - by);
    // Glowing windows
    for (let wy = by + 12; wy < H * 0.9; wy += 14) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) {
        c.fillStyle = (Math.sin(wx * 11 + wy * 7) > 0.1) ? '#00f5d4' : '#ffd23f';
        c.fillRect(wx, wy, 4, 6);
      }
    }
    c.fillStyle = '#10002b';
  });

  // Neon reflective ground grid
  c.fillStyle = '#0a0017';
  c.fillRect(0, H * 0.86, W, H * 0.14);
  c.strokeStyle = '#ff007f';
  c.lineWidth = 2;
  for (let gx = 0; gx < W; gx += W * 0.08) {
    c.beginPath();
    c.moveTo(W * 0.5, H * 0.86);
    c.lineTo(gx, H);
    c.stroke();
  }
}

function renderDemoArtwork() {
  curImg = null;
  drawProceduralArt(sx);
  buildParticles();
}

function fitImage(img) {
  curImg = img;
  const fitMode = ui.fitMode.value;
  sx.clearRect(0, 0, W, H);

  if (fitMode === 'cover') {
    const scale = Math.max(W / img.width, H / img.height);
    const nw = img.width * scale;
    const nh = img.height * scale;
    sx.drawImage(img, (W - nw) / 2, (H - nh) / 2, nw, nh);
  } else if (fitMode === 'blur') {
    const bgScale = Math.max(W / img.width, H / img.height);
    const bw = img.width * bgScale;
    const bh = img.height * bgScale;
    sx.drawImage(img, (W - bw) / 2, (H - bh) / 2, bw, bh);

    sx.fillStyle = 'rgba(10, 6, 18, 0.65)';
    sx.fillRect(0, 0, W, H);

    const fgScale = Math.min(W / img.width, H / img.height);
    const fw = img.width * fgScale;
    const fh = img.height * fgScale;
    sx.drawImage(img, (W - fw) / 2, (H - fh) / 2, fw, fh);
  } else {
    sx.fillStyle = ui.bg.value;
    sx.fillRect(0, 0, W, H);

    const fgScale = Math.min(W / img.width, H / img.height);
    const fw = img.width * fgScale;
    const fh = img.height * fgScale;
    sx.drawImage(img, (W - fw) / 2, (H - fh) / 2, fw, fh);
  }

  buildParticles();
}

// ============================================================================
// 5. PARTICLE GENERATION & REVEAL ALGORITHMS
// ============================================================================
function computeEdgeMagnitudes(data, width, height) {
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const left = data[idx - 4];
      const right = data[idx + 4];
      const top = data[((y - 1) * width + x) * 4];
      const bottom = data[((y + 1) * width + x) * 4];
      const gx = right - left;
      const gy = bottom - top;
      edges[y * width + x] = Math.hypot(gx, gy) / 360;
    }
  }
  return edges;
}

function buildParticles() {
  const cellSize = parseInt(ui.cell.value, 10);
  const totalDurMs = parseFloat(ui.dur.value) * 1000;
  const popMs = parseFloat(ui.pop.value) * 1000;
  const span = Math.max(100, totalDurMs - popMs);
  const pat = ui.pattern.value;

  let imgData;
  try {
    imgData = sx.getImageData(0, 0, W, H).data;
  } catch (err) {
    console.warn('Canvas tainted or security error, falling back to procedural art', err);
    curImg = null;
    drawProceduralArt(sx);
    imgData = sx.getImageData(0, 0, W, H).data;
  }

  let edgesMap = null;
  if (pat === 'edges') {
    edgesMap = computeEdgeMagnitudes(imgData, W, H);
  }

  P = [];
  const maxHypot = Math.hypot(W, H);

  for (let y = 0; y < H; y += cellSize) {
    for (let x = 0; x < W; x += cellSize) {
      const sampleX = Math.min(W - 1, x + (cellSize >> 1));
      const sampleY = Math.min(H - 1, y + (cellSize >> 1));
      const idx = (sampleY * W + sampleX) * 4;

      const rawR = imgData[idx];
      const rawG = imgData[idx + 1];
      const rawB = imgData[idx + 2];
      const [finalR, finalG, finalB] = applyPresetColor(rawR, rawG, rawB);

      const normX = x / W;
      const normY = y / H;
      const lum = (0.299 * rawR + 0.587 * rawG + 0.114 * rawB) / 255;
      let delayWeight = Math.random();

      if (pat === 'sweep') {
        delayWeight = normX * 0.85 + delayWeight * 0.15;
      } else if (pat === 'sweep-tb') {
        delayWeight = normY * 0.85 + delayWeight * 0.15;
      } else if (pat === 'ripple') {
        const dist = Math.hypot(normX - origin[0], normY - origin[1]) / 1.42;
        delayWeight = dist * 0.85 + delayWeight * 0.15;
      } else if (pat === 'spiral') {
        const dx = normX - 0.5;
        const dy = normY - 0.5;
        const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
        const dist = Math.hypot(dx, dy) * 1.5;
        delayWeight = ((angle * 0.6 + dist * 0.4) % 1) * 0.85 + delayWeight * 0.15;
      } else if (pat === 'luminance') {
        delayWeight = (1 - lum) * 0.85 + delayWeight * 0.15; // Shadows pop first
      } else if (pat === 'edges' && edgesMap) {
        const edgeVal = edgesMap[sampleY * W + sampleX] || 0;
        delayWeight = (1 - Math.min(1, edgeVal * 1.5)) * 0.85 + delayWeight * 0.15;
      }

      const delayMs = Math.min(1, Math.max(0, delayWeight)) * span;
      const pitchNorm = (delayWeight + lum) * 0.5; // Modulates ASMR audio pitch

      P.push([x, y, finalR, finalG, finalB, delayMs, pitchNorm]);
    }
  }

  totalDuration = totalDurMs + 1200;
  T = 0;

  // Update HUD pill with particle count
  $('#hud-particles').textContent = `${P.length.toLocaleString()} dots`;
}

// ============================================================================
// 6. RENDER LOOP & DRAWING
// ============================================================================
function drawParticles(t) {
  const cellSize = parseInt(ui.cell.value, 10);
  const shape = ui.shape.value;
  const popMs = parseFloat(ui.pop.value) * 1000;
  const elasticVal = parseFloat(ui.elastic.value);

  // Background clear
  cx.fillStyle = ui.bg.value;
  cx.fillRect(0, 0, W, H);

  let activePopsCount = 0;
  let dominantPitch = 0.5;

  // Beat-Sync Energy Detection
  let bassPulse = 0;
  const beatSyncEnabled = $('#beat-sync') && $('#beat-sync').checked;
  if (beatSyncEnabled) {
    const energy = audio.getAudioEnergy();
    bassPulse = energy.bass;
    const vuFill = $('#vu-fill');
    if (vuFill) {
      vuFill.style.width = `${Math.min(100, Math.round(bassPulse * 100))}%`;
    }
  }

  for (let i = 0; i < P.length; i++) {
    const [x, y, r, g, b, delay, pitch] = P[i];
    const progress = Math.min(1, (t - delay) / popMs);
    if (progress <= 0) continue;

    // Track sound trigger for active popping window
    if (progress > 0.05 && progress < 0.4) {
      activePopsCount++;
      dominantPitch = pitch;
    }

    let scaleFactor = cellSize * 1.06 * Math.max(0, easeOvershoot(progress, elasticVal));
    if (bassPulse > 0.08) {
      scaleFactor *= (1.0 + bassPulse * 0.35);
    }

    const mx = x + cellSize / 2;
    const my = y + cellSize / 2;

    cx.fillStyle = `rgb(${r},${g},${b})`;

    switch (shape) {
      case 'circle':
        cx.beginPath();
        cx.arc(mx, my, scaleFactor / 2, 0, Math.PI * 2);
        cx.fill();
        break;

      case 'diamond': {
        const d = scaleFactor * 0.68;
        cx.beginPath();
        cx.moveTo(mx, my - d);
        cx.lineTo(mx + d, my);
        cx.lineTo(mx, my + d);
        cx.lineTo(mx - d, my);
        cx.fill();
        break;
      }

      case 'hexagon': {
        const rad = scaleFactor * 0.55;
        cx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3;
          const px = mx + rad * Math.cos(angle);
          const py = my + rad * Math.sin(angle);
          if (a === 0) cx.moveTo(px, py);
          else cx.lineTo(px, py);
        }
        cx.closePath();
        cx.fill();
        break;
      }

      case 'star': {
        const rOuter = scaleFactor * 0.6;
        const rInner = rOuter * 0.4;
        cx.beginPath();
        for (let a = 0; a < 8; a++) {
          const rad = (a % 2 === 0) ? rOuter : rInner;
          const angle = (a * Math.PI) / 4;
          const px = mx + rad * Math.cos(angle);
          const py = my + rad * Math.sin(angle);
          if (a === 0) cx.moveTo(px, py);
          else cx.lineTo(px, py);
        }
        cx.closePath();
        cx.fill();
        break;
      }

      case 'cross': {
        const arm = scaleFactor * 0.5;
        const th = Math.max(1.5, scaleFactor * 0.28);
        cx.fillRect(mx - arm, my - th / 2, arm * 2, th);
        cx.fillRect(mx - th / 2, my - arm, th, arm * 2);
        break;
      }

      case 'heart': {
        const s = scaleFactor * 0.45;
        cx.beginPath();
        cx.moveTo(mx, my + s * 0.6);
        cx.bezierCurveTo(mx + s, my, mx + s * 0.8, my - s * 0.9, mx, my - s * 0.3);
        cx.bezierCurveTo(mx - s * 0.8, my - s * 0.9, mx - s, my, mx, my + s * 0.6);
        cx.fill();
        break;
      }

      case 'square':
      default:
        cx.fillRect(mx - scaleFactor / 2, my - scaleFactor / 2, scaleFactor, scaleFactor);
        break;
    }
  }

  // Trigger ASMR sound if active particles are emerging
  if (activePopsCount > 0 && !isPaused && audio.mode === 'asmr') {
    audio.triggerPop(dominantPitch);
  }

  // Final high-res fade in smoothly reveals complete image detail at end
  const finishTime = parseFloat(ui.dur.value) * 1000;
  const fade = (t - finishTime) / 600;
  if (fade > 0 && currentPreset === 'original') {
    cx.globalAlpha = Math.min(1, fade);
    cx.drawImage(src, 0, 0);
    cx.globalAlpha = 1;
  }

  // Apply Retro FX Engine (CRT scanlines, RGB split chroma, VHS glitch)
  applyRetroFX(cx, W, H, t);

  // Update timeline scrubber
  updatePlaybackUI(t);
}

function applyRetroFX(targetCtx, w, h, t) {
  const crt = $('#fx-crt')?.checked;
  const chroma = $('#fx-chroma')?.checked;
  const vhs = $('#fx-vhs')?.checked;

  if (chroma) {
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    const offset = Math.floor(Math.sin(t * 0.008) * 3 + 2);
    targetCtx.drawImage(targetCtx.canvas, -offset, 0);
    targetCtx.restore();
  }

  if (vhs) {
    if (Math.random() < 0.16) {
      const sliceY = Math.random() * h;
      const sliceH = 6 + Math.random() * 20;
      const shiftX = (Math.random() - 0.5) * 14;
      targetCtx.drawImage(targetCtx.canvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);
    }
  }

  if (crt) {
    targetCtx.save();
    targetCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < h; y += 3) {
      targetCtx.fillRect(0, y, w, 1);
    }
    const vig = targetCtx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.72);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    targetCtx.fillStyle = vig;
    targetCtx.fillRect(0, 0, w, h);
    targetCtx.restore();
  }
}

function updatePlaybackUI(t) {
  const pct = Math.min(100, Math.max(0, (t / totalDuration) * 100));
  $('#progress-fill').style.width = `${pct}%`;
  $('#time-display').textContent = `${(t / 1000).toFixed(1)}s / ${(totalDuration / 1000).toFixed(1)}s`;
}

function handleAnimationNext() {
  const isSlide = $('#v-pop').dataset.mode === 'slide';
  if (isSlide && slides.length > 0) {
    const isLast = slideIdx === slides.length - 1;
    if (recorder && isLast) {
      recorder.stop();
      recorder = null;
    }
    slideIdx = isLast ? 0 : slideIdx + 1;
    fitImage(slides[slideIdx]);
    updateSlideThumbnails();
    $('#msg-text').textContent = `Slide ${slideIdx + 1} of ${slides.length}`;
    T = 0;
    return;
  }

  if (recorder) {
    recorder.stop();
    recorder = null;
  }

  // Loop animation smoothly
  T = 0;
}

// FPS measurement
let frameCount = 0;
let lastFpsCheck = 0;

function animationLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = Math.min(64, timestamp - lastFrameTime);
  lastFrameTime = timestamp;

  // FPS calculation
  frameCount++;
  if (timestamp - lastFpsCheck >= 1000) {
    const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsCheck));
    $('#hud-fps').textContent = `${fps} FPS`;
    frameCount = 0;
    lastFpsCheck = timestamp;
  }

  if (!$('#v-pop').hidden) {
    if (!isPaused || recorder) {
      T += delta;
      if (T >= totalDuration) {
        handleAnimationNext();
      }
    }
    drawParticles(Math.min(T, totalDuration));
  }

  requestAnimationFrame(animationLoop);
}

// ============================================================================
// 7. RECORDING & VIDEO EXPORT (WITH ASMR AUDIO!)
// ============================================================================
function recordVideo() {
  if (!window.MediaRecorder) {
    alert('Your browser does not support MediaRecorder video capture. Please use Chrome, Edge, or Safari.');
    return;
  }

  // Audio setup
  audio.init();

  const supportedTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const mimeType = supportedTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const isMp4 = mimeType.includes('mp4');
  const btn = $('#rec');

  // Video track at full 60 FPS
  const videoStream = cv.captureStream(60);
  const tracks = [...videoStream.getVideoTracks()];

  // Mux audio track if sound engine is active
  if (audio.enabled && audio.dest) {
    const audioTracks = audio.dest.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      tracks.push(audioTracks[0]);
    }
  }

  const combinedStream = new MediaStream(tracks);
  const chunks = [];

  let mr;
  try {
    mr = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 14e6 // High-definition 14 Mbps
    });
  } catch (err) {
    console.warn('Audio-video combined recording failed, falling back to video-only', err);
    mr = new MediaRecorder(videoStream, {
      mimeType,
      videoBitsPerSecond: 14e6
    });
  }
  recorder = mr;

  recorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const filename = `pixel-reveal-${currentRatioKey.replace(':', 'x')}-${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`;
    saveFile(blob, filename);

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      <span>Download 60 FPS Video (with Audio)</span>
    `;
    $('#msg-text').textContent = 'Video exported successfully!';
  };

  btn.disabled = true;
  btn.innerHTML = '<span>Rendering 60 FPS Video…</span>';

  // Restart animation for clean start
  if ($('#v-pop').dataset.mode === 'slide' && slides.length > 0) {
    slideIdx = 0;
    fitImage(slides[0]);
  }
  T = 0;
  isPaused = false;
  recorder.start();
}

function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

// ============================================================================
// 8. INTERACTIVE BEFORE & AFTER ENGINE
// ============================================================================
const ba = $('#ba');
const bx = ba.getContext('2d');
const bsrc = document.createElement('canvas');
const bsx = bsrc.getContext('2d');
const baTiny = document.createElement('canvas');
const baTx = baTiny.getContext('2d');
let baAutoAnimId = null;

function initBeforeAfter() {
  ba.width = 720;
  ba.height = 720;
  bsrc.width = 720;
  bsrc.height = 720;
  baTx.imageSmoothingQuality = 'high';

  const img = new Image();
  img.onload = () => {
    bsx.clearRect(0, 0, ba.width, ba.height);
    const k = Math.max(ba.width / img.width, ba.height / img.height);
    const w = img.width * k;
    const h = img.height * k;
    bsx.drawImage(img, (ba.width - w) / 2, (ba.height - h) / 2, w, h);
    drawBA();
  };
  img.onerror = () => {
    const g = bsx.createLinearGradient(0, 0, 720, 720);
    g.addColorStop(0, '#ff3366');
    g.addColorStop(0.5, '#ffd23f');
    g.addColorStop(1, '#00f5d4');
    bsx.fillStyle = g;
    bsx.fillRect(0, 0, 720, 720);
    bsx.fillStyle = '#fff6ea';
    bsx.beginPath();
    bsx.arc(500, 250, 110, 0, Math.PI * 2);
    bsx.fill();
    drawBA();
  };
  img.src = 'sample1.jpg';
}

function drawBA() {
  const splitPct = parseFloat($('#split').value);
  const splitX = (splitPct / 100) * ba.width;
  const cellSize = parseInt($('#bacell').value, 10);
  const renderStyle = $('#ba-style').value;

  $('#splitv').textContent = `${Math.round(splitPct)}%`;
  $('#bacv').textContent = `${cellSize} px`;

  // Update visual handle line
  $('#ba-handle').style.left = `${splitPct}%`;

  bx.clearRect(0, 0, ba.width, ba.height);

  // Left side: Original Image
  bx.drawImage(bsrc, 0, 0);

  // Right side: Quantized Pixel Pop
  bx.save();
  bx.beginPath();
  bx.rect(splitX, 0, ba.width - splitX, ba.height);
  bx.clip();

  if (renderStyle === 'dots') {
    // Dot Matrix
    bx.fillStyle = '#0d0914';
    bx.fillRect(splitX, 0, ba.width - splitX, ba.height);
    const imgData = bsx.getImageData(0, 0, ba.width, ba.height).data;
    for (let y = 0; y < ba.height; y += cellSize) {
      for (let x = Math.floor(splitX / cellSize) * cellSize; x < ba.width; x += cellSize) {
        const idx = (y * ba.width + x) * 4;
        bx.fillStyle = `rgb(${imgData[idx]},${imgData[idx+1]},${imgData[idx+2]})`;
        bx.beginPath();
        bx.arc(x + cellSize / 2, y + cellSize / 2, (cellSize / 2) * 0.9, 0, Math.PI * 2);
        bx.fill();
      }
    }
  } else {
    // Crisp pixel mosaic
    const nx = Math.ceil(ba.width / cellSize);
    const ny = Math.ceil(ba.height / cellSize);
    baTiny.width = nx;
    baTiny.height = ny;
    baTx.drawImage(bsrc, 0, 0, nx, ny);
    bx.imageSmoothingEnabled = false;
    bx.drawImage(baTiny, 0, 0, nx, ny, 0, 0, nx * cellSize, ny * cellSize);
  }

  bx.restore();

  // Draw stylish badges
  drawBALabel('ORIGINAL', 24, 'left');
  drawBALabel('PIXEL POP', ba.width - 24, 'right');
}

function drawBALabel(text, x, align) {
  bx.textAlign = align;
  bx.font = '800 22px "Bricolage Grotesque", sans-serif';
  bx.lineWidth = 4;
  bx.strokeStyle = '#0d0914';
  bx.strokeText(text, x, 42);
  bx.fillStyle = '#ffd23f';
  bx.fillText(text, x, 42);
}

function scrubBA(e) {
  const rect = ba.getBoundingClientRect();
  const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  $('#split').value = pct;
  drawBA();
}

ba.addEventListener('pointerdown', e => {
  ba.setPointerCapture(e.pointerId);
  scrubBA(e);
  ba.onpointermove = scrubBA;
});
ba.addEventListener('pointerup', () => { ba.onpointermove = null; });
ba.addEventListener('pointercancel', () => { ba.onpointermove = null; });

// Auto sweep animation for Before & After
$('#ba-auto').onclick = () => {
  if (baAutoAnimId) {
    cancelAnimationFrame(baAutoAnimId);
    baAutoAnimId = null;
    return;
  }
  let direction = 1;
  function sweep() {
    let val = parseFloat($('#split').value) + 0.6 * direction;
    if (val >= 98) { val = 98; direction = -1; }
    if (val <= 2) { val = 2; direction = 1; }
    $('#split').value = val;
    drawBA();
    baAutoAnimId = requestAnimationFrame(sweep);
  }
  baAutoAnimId = requestAnimationFrame(sweep);
};

// ============================================================================
// 9. EVENT BINDINGS & CONTROLS
// ============================================================================

// File loaders
const fileToImage = file => new Promise(resolve => {
  if (!file || !file.type.startsWith('image/')) return resolve(null);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = URL.createObjectURL(file);
});

async function handleSingleFile(file) {
  const img = await fileToImage(file);
  if (img) fitImage(img);
}

async function handleMultiFiles(files) {
  const loaded = await Promise.all([...files].map(fileToImage));
  const valid = loaded.filter(Boolean);
  slides = slides.concat(valid);
  slideIdx = 0;
  updateSlideThumbnails();
  if (slides.length > 0) fitImage(slides[0]);
}

function updateSlideThumbnails() {
  const strip = $('#thumb-strip');
  strip.innerHTML = '';
  slides.forEach((img, idx) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.className = `thumb-item ${idx === slideIdx ? 'active' : ''}`;
    thumb.onclick = () => {
      slideIdx = idx;
      fitImage(slides[slideIdx]);
      updateSlideThumbnails();
    };
    strip.appendChild(thumb);
  });
  $('#count').textContent = `${slides.length} photos ready in reel`;
}

// File Inputs
$('#file').onchange = e => handleSingleFile(e.target.files[0]);
$('#files').onchange = e => handleMultiFiles(e.target.files);
$('#demo').onclick = () => loadSampleImage(currentRatioKey === '9:16' ? 'sample2.jpg' : 'sample1.jpg');
$('#slide-demo').onclick = () => {
  const urls = ['sample1.jpg', 'sample2.jpg'];
  const loaded = [];
  let pending = urls.length;
  urls.forEach((url, i) => {
    const img = new Image();
    img.onload = () => {
      loaded[i] = img;
      pending--;
      if (pending === 0) {
        slides = loaded.filter(Boolean);
        slideIdx = 0;
        updateSlideThumbnails();
        if (slides.length) fitImage(slides[0]);
      }
    };
    img.onerror = () => {
      pending--;
      if (pending === 0 && loaded.filter(Boolean).length) {
        slides = loaded.filter(Boolean);
        slideIdx = 0;
        updateSlideThumbnails();
        fitImage(slides[0]);
      }
    };
    img.src = url;
  });
};

$('#clear').onclick = () => {
  slides = [];
  slideIdx = 0;
  updateSlideThumbnails();
  renderDemoArtwork();
};

// Before & After Input
$('#bafile').onchange = async e => {
  const img = await fileToImage(e.target.files[0]);
  if (img) {
    bsx.clearRect(0, 0, ba.width, ba.height);
    const k = Math.max(ba.width / img.width, ba.height / img.height);
    const w = img.width * k;
    const h = img.height * k;
    bsx.drawImage(img, (ba.width - w) / 2, (ba.height - h) / 2, w, h);
    drawBA();
  }
};
$('#bademo').onclick = initBeforeAfter;
$('#bapng').onclick = () => {
  ba.toBlob(blob => saveFile(blob, 'pixel-compare.png'));
};
$('#split').oninput = drawBA;
$('#bacell').oninput = drawBA;
$('#ba-style').onchange = drawBA;

// Mode Tabs
$$('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tab = btn.dataset.tab;
    const vPop = $('#v-pop');
    const vBa = $('#v-ba');
    const vCam = $('#v-cam');

    if (tab === 'cam') {
      vPop.hidden = true;
      vBa.hidden = true;
      vCam.hidden = false;
    } else if (tab === 'ba') {
      vPop.hidden = true;
      vBa.hidden = false;
      vCam.hidden = true;
      stopWebcamMirror();
      drawBA();
    } else {
      vPop.hidden = false;
      vBa.hidden = true;
      vCam.hidden = true;
      stopWebcamMirror();
      vPop.dataset.mode = tab;

      const isSlide = tab === 'slide';
      $('#slideshow-tray').hidden = !isSlide;
      $$('.only-pop').forEach(el => el.style.display = isSlide ? 'none' : 'block');
      $$('.only-slide').forEach(el => el.style.display = isSlide ? 'block' : 'none');

      if (isSlide) {
        $('#mode-heading').textContent = 'Continuous Story Reel.';
        $('#mode-sub').textContent = 'Queue several photos. Each one reveals in a burst of dots before transitioning to the next.';
        if (slides.length > 0) fitImage(slides[slideIdx]);
        else renderDemoArtwork();
      } else {
        $('#mode-heading').textContent = 'Your photo, one pop at a time.';
        $('#mode-sub').textContent = 'Upload any image. Tiny animated dots burst and bounce into place with tactile ASMR pops.';
        if (curImg) fitImage(curImg);
        else renderDemoArtwork();
      }
    }
  };
});

// Aspect Ratio selector
$$('.aspect-chip').forEach(btn => {
  btn.onclick = () => setAspectRatio(btn.dataset.ratio);
});

// 1-Click Aesthetic Presets
$$('.preset-chip').forEach(chip => {
  chip.onclick = () => {
    $$('.preset-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentPreset = chip.dataset.preset;
    buildParticles();
    T = 0;
    isPaused = false;
    $('.icon-pause').style.display = 'block';
    $('.icon-play').style.display = 'none';
  };
});

// Quick Sample Gallery buttons (Pop Solo & Reel)
$$('.sample-btn:not(.ba-sample-btn)').forEach(btn => {
  btn.onclick = () => {
    $$('.sample-btn:not(.ba-sample-btn)').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const sample = btn.dataset.sample;
    const ratio = btn.dataset.ratio;
    if (ratio && ratio !== currentRatioKey) {
      setAspectRatio(ratio);
    }
    if (sample === 'demo') {
      renderDemoArtwork();
    } else {
      loadSampleImage(sample);
    }
    T = 0;
    isPaused = false;
    $('.icon-pause').style.display = 'block';
    $('.icon-play').style.display = 'none';
  };
});

// Quick Sample buttons (Before & After)
$$('.ba-sample-btn').forEach(btn => {
  btn.onclick = () => {
    $$('.ba-sample-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const sample = btn.dataset.sample;
    const img = new Image();
    img.onload = () => {
      bsx.clearRect(0, 0, ba.width, ba.height);
      const k = Math.max(ba.width / img.width, ba.height / img.height);
      const w = img.width * k;
      const h = img.height * k;
      bsx.drawImage(img, (ba.width - w) / 2, (ba.height - h) / 2, w, h);
      drawBA();
    };
    img.src = sample;
  };
});

// Sliders and options
ui.cell.oninput = () => {
  $('#cellv').textContent = `${ui.cell.value} px`;
  buildParticles();
};
ui.dur.oninput = () => {
  $('#durv').textContent = `${ui.dur.value} s`;
  buildParticles();
};
ui.pop.oninput = () => {
  $('#popv').textContent = `${ui.pop.value} s`;
};
ui.elastic.oninput = () => {
  const v = parseFloat(ui.elastic.value);
  $('#elasticv').textContent = v < 1.4 ? 'Soft' : v > 2.2 ? 'Hyper' : 'Medium';
};
ui.pattern.onchange = buildParticles;
ui.shape.onchange = () => {};
ui.fitMode.onchange = () => {
  if (curImg) fitImage(curImg);
  else renderDemoArtwork();
};
ui.bg.oninput = () => {
  $('#bg-hex').textContent = ui.bg.value;
};

// Sound Widget
$('#sound-toggle').onclick = () => {
  audio.init();
  audio.enabled = !audio.enabled;
  const isMuted = !audio.enabled;
  $('#sound-toggle').classList.toggle('muted', isMuted);
  $('.icon-sound-on').style.display = isMuted ? 'none' : 'block';
  $('.icon-sound-off').style.display = isMuted ? 'block' : 'none';
  $('#hud-audio').textContent = isMuted ? '🔇 Audio OFF' : `🫧 ${ui.soundStyle.options[ui.soundStyle.selectedIndex].text}`;
  $('#hud-audio').classList.toggle('audio-pill', !isMuted);
};

ui.soundVol.oninput = () => {
  const val = parseFloat(ui.soundVol.value);
  audio.setVolume(val);
  $('#vol-val').textContent = `${Math.round(val * 100)}%`;
};

ui.soundStyle.onchange = () => {
  audio.soundType = ui.soundStyle.value;
  $('#hud-audio').textContent = `🫧 ${ui.soundStyle.options[ui.soundStyle.selectedIndex].text}`;
};

// Canvas Click - Ripple epicenter & visual marker
cv.onclick = e => {
  audio.init();
  const rect = cv.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  origin = [clickX / rect.width, clickY / rect.height];

  // Visual Ping wave
  const ping = $('#ripple-ping');
  ping.style.left = `${clickX}px`;
  ping.style.top = `${clickY}px`;
  ping.classList.remove('active');
  void ping.offsetWidth; // trigger reflow
  ping.classList.add('active');

  if (ui.pattern.value === 'ripple') {
    buildParticles();
    T = 0;
  }
};

// Play / Pause / Replay
function togglePlayPause() {
  isPaused = !isPaused;
  $('.icon-pause').style.display = isPaused ? 'none' : 'block';
  $('.icon-play').style.display = isPaused ? 'block' : 'none';
}

$('#play-pause').onclick = togglePlayPause;
$('#quick-replay').onclick = () => {
  T = 0;
  isPaused = false;
  $('.icon-pause').style.display = 'block';
  $('.icon-play').style.display = 'none';
};

// Interactive Draggable Timeline Scrubber
function scrubTimeline(e) {
  const track = $('#progress-track');
  const rect = track.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  T = pct * totalDuration;
  drawParticles(Math.min(T, totalDuration));
}

let isScrubbing = false;
const trackEl = $('#progress-track');
trackEl.addEventListener('pointerdown', e => {
  isScrubbing = true;
  trackEl.setPointerCapture(e.pointerId);
  scrubTimeline(e);
});
trackEl.addEventListener('pointermove', e => {
  if (isScrubbing) scrubTimeline(e);
});
trackEl.addEventListener('pointerup', () => { isScrubbing = false; });
trackEl.addEventListener('pointercancel', () => { isScrubbing = false; });

// Unlock Web Audio API on first user gesture
window.addEventListener('pointerdown', () => {
  if (audio && audio.enabled) audio.init();
}, { once: true });

// Export Handlers
$('#rec').onclick = recordVideo;
$('#png').onclick = () => {
  drawParticles(totalDuration);
  cv.toBlob(blob => saveFile(blob, `pixel-reveal-${currentRatioKey.replace(':', 'x')}.png`));
};

// Web Share API
$('#share-btn').onclick = async () => {
  if (navigator.share) {
    try {
      cv.toBlob(async blob => {
        const file = new File([blob], 'pixel-reveal.png', { type: 'image/png' });
        await navigator.share({
          title: 'Pixel Reveal Studio',
          text: 'Check out this photo reveal made with Pixel Reveal Studio!',
          files: [file]
        });
      });
    } catch (err) {
      console.log('Share canceled or unsupported', err);
    }
  } else {
    // Fallback: download still PNG
    $('#png').click();
  }
};

// Drag and drop
const dropOverlay = $('#drop');
window.addEventListener('dragover', e => {
  e.preventDefault();
  if (!$('#v-pop').hidden) dropOverlay.hidden = false;
});
window.addEventListener('dragleave', e => {
  if (!e.relatedTarget) dropOverlay.hidden = true;
});
window.addEventListener('drop', e => {
  e.preventDefault();
  dropOverlay.hidden = true;
  const files = e.dataTransfer.files;
  if (!files || !files.length) return;

  if (!$('#v-ba').hidden) {
    $('#bafile').files = files;
    $('#bafile').dispatchEvent(new Event('change'));
  } else if ($('#v-pop').dataset.mode === 'slide') {
    handleMultiFiles(files);
  } else {
    handleSingleFile(files[0]);
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlayPause();
  } else if (e.code === 'KeyR') {
    $('#quick-replay').click();
  }
});

// Soundtrack Mode selector (ASMR, Synthwave, Lo-Fi, Custom)
const soundtrackSelect = $('#soundtrack-mode');
if (soundtrackSelect) {
  soundtrackSelect.onchange = () => {
    const mode = soundtrackSelect.value;
    const customWrap = $('#custom-audio-wrap');
    if (customWrap) customWrap.style.display = (mode === 'custom') ? 'block' : 'none';

    if (mode === 'synthwave' || mode === 'lofi') {
      audio.startBeats(mode);
      $('#hud-audio').textContent = `🎧 ${mode.toUpperCase()} Beats`;
      $('#hud-audio').classList.add('audio-pill');
    } else if (mode === 'custom') {
      if (audio.customBuffer) audio.playCustomAudio();
      $('#hud-audio').textContent = '🎶 Custom Track';
      $('#hud-audio').classList.add('audio-pill');
    } else {
      audio.stopBeats();
      audio.mode = 'asmr';
      $('#hud-audio').textContent = `🫧 ${ui.soundStyle.options[ui.soundStyle.selectedIndex].text}`;
    }
  };
}

const musicFileInput = $('#music-file');
if (musicFileInput) {
  musicFileInput.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      audio.loadCustomAudio(file);
      $('#msg-text').textContent = `Loaded music: ${file.name}`;
    }
  };
}

// Retro FX Checkbox change handlers - redraw immediately
['#fx-crt', '#fx-chroma', '#fx-vhs'].forEach(selector => {
  const el = $(selector);
  if (el) el.onchange = () => drawParticles(T);
});

// ============================================================================
// 7. ANIMATED GIF & DISCORD STICKER EXPORTER
// ============================================================================
async function exportAnimatedGif() {
  const exportBtn = $('#export-gif');
  if (!exportBtn) return;
  const originalHtml = exportBtn.innerHTML;
  exportBtn.disabled = true;
  exportBtn.innerHTML = `<span>Encoding GIF (0%)...</span>`;

  try {
    const gifFrames = [];
    const numFrames = 16;
    const durMs = parseFloat(ui.dur.value) * 1000;
    const frameDelayCentisec = Math.max(4, Math.round((durMs / numFrames) / 10));

    // Scaled canvas for fast 360px sticker encoding
    const gifW = 360;
    const gifH = Math.round(360 * (H / W));
    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = gifW;
    gifCanvas.height = gifH;
    const gifCtx = gifCanvas.getContext('2d');

    for (let f = 0; f < numFrames; f++) {
      const sampleTime = (f / (numFrames - 1)) * (durMs + 400);
      drawParticles(sampleTime);
      gifCtx.drawImage(cv, 0, 0, gifW, gifH);
      const imgData = gifCtx.getImageData(0, 0, gifW, gifH);
      gifFrames.push(imgData);

      const pct = Math.round(((f + 1) / numFrames) * 85);
      exportBtn.innerHTML = `<span>Encoding GIF (${pct}%)...</span>`;
      await new Promise(r => setTimeout(r, 15));
    }

    const gifBlob = encodeGif89a(gifW, gifH, gifFrames, frameDelayCentisec);
    const filename = `pixel-reveal-${currentRatioKey.replace(':', 'x')}-${Date.now()}.gif`;
    saveFile(gifBlob, filename);

    $('#msg-text').textContent = 'Animated GIF sticker exported successfully!';
  } catch (err) {
    console.error('GIF export failed', err);
    $('#msg-text').textContent = 'GIF export error: ' + err.message;
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = originalHtml;
    T = 0;
  }
}

if ($('#export-gif')) {
  $('#export-gif').onclick = exportAnimatedGif;
}

function encodeGif89a(width, height, frames, delayCentisec = 6) {
  const palette = [];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette.push([Math.round(r * 51), Math.round(g * 51), Math.round(b * 51)]);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const v = Math.round((i / 39) * 255);
    palette.push([v, v, v]);
  }

  function getNearestPaletteIndex(r, g, b) {
    const ri = Math.min(5, Math.round(r / 51));
    const gi = Math.min(5, Math.round(g / 51));
    const bi = Math.min(5, Math.round(b / 51));
    return ri * 36 + gi * 6 + bi;
  }

  const bytes = [];
  function writeByte(b) { bytes.push(b & 0xFF); }
  function writeShort(val) {
    bytes.push(val & 0xFF);
    bytes.push((val >> 8) & 0xFF);
  }
  function writeString(str) {
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  }

  writeString('GIF89a');
  writeShort(width);
  writeShort(height);
  writeByte(0xF7); // Global Color Table (256 colors)
  writeByte(0);    // Background color index
  writeByte(0);    // Aspect ratio

  for (let i = 0; i < 256; i++) {
    writeByte(palette[i][0]);
    writeByte(palette[i][1]);
    writeByte(palette[i][2]);
  }

  // Netscape loop extension
  writeByte(0x21);
  writeByte(0xFF);
  writeByte(0x0B);
  writeString('NETSCAPE2.0');
  writeByte(0x03);
  writeByte(0x01);
  writeShort(0);
  writeByte(0x00);

  for (let f = 0; f < frames.length; f++) {
    const frameData = frames[f].data;
    writeByte(0x21);
    writeByte(0xF9);
    writeByte(0x04);
    writeByte(0x00);
    writeShort(delayCentisec);
    writeByte(0);
    writeByte(0x00);

    writeByte(0x2C);
    writeShort(0);
    writeShort(0);
    writeShort(width);
    writeShort(height);
    writeByte(0x00);

    const numPixels = width * height;
    const indexedPixels = new Uint8Array(numPixels);
    for (let p = 0; p < numPixels; p++) {
      const idx = p * 4;
      indexedPixels[p] = getNearestPaletteIndex(frameData[idx], frameData[idx + 1], frameData[idx + 2]);
    }

    lzwEncode(8, indexedPixels, bytes);
  }

  writeByte(0x3B);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

function lzwEncode(minCodeSize, pixels, outBytes) {
  outBytes.push(minCodeSize);
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let curCodeSize = minCodeSize + 1;
  let maxCode = (1 << curCodeSize) - 1;
  let nextCode = eoiCode + 1;

  let codeTable = new Map();
  function resetTable() {
    codeTable.clear();
    curCodeSize = minCodeSize + 1;
    maxCode = (1 << curCodeSize) - 1;
    nextCode = eoiCode + 1;
  }
  resetTable();

  let bitBuf = 0;
  let bitCount = 0;
  const subBlock = [];

  function writeCode(code) {
    bitBuf |= (code << bitCount);
    bitCount += curCodeSize;
    while (bitCount >= 8) {
      subBlock.push(bitBuf & 0xFF);
      bitBuf >>= 8;
      bitCount -= 8;
      if (subBlock.length === 254) {
        outBytes.push(subBlock.length);
        for (let b = 0; b < subBlock.length; b++) outBytes.push(subBlock[b]);
        subBlock.length = 0;
      }
    }
  }

  writeCode(clearCode);

  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i];
    const key = (prefix << 8) | k;
    if (codeTable.has(key)) {
      prefix = codeTable.get(key);
    } else {
      writeCode(prefix);
      if (nextCode < 4096) {
        codeTable.set(key, nextCode++);
        if (nextCode > maxCode && curCodeSize < 12) {
          curCodeSize++;
          maxCode = (1 << curCodeSize) - 1;
        }
      } else {
        writeCode(clearCode);
        resetTable();
      }
      prefix = k;
    }
  }

  writeCode(prefix);
  writeCode(eoiCode);

  if (bitCount > 0) subBlock.push(bitBuf & 0xFF);
  if (subBlock.length > 0) {
    outBytes.push(subBlock.length);
    for (let b = 0; b < subBlock.length; b++) outBytes.push(subBlock[b]);
  }
  outBytes.push(0x00);
}

// ============================================================================
// 8. LIVE WEBCAM PIXEL MIRROR ENGINE
// ============================================================================
let webcamStream = null;
let webcamVideo = null;
let camAnimationId = null;
let isCamRecording = false;

async function startWebcamMirror() {
  const btn = $('#cam-start-btn');
  const msg = $('#cam-msg');
  if (webcamStream) {
    stopWebcamMirror();
    return;
  }
  try {
    msg.textContent = 'Requesting camera access...';
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' }
    });
    webcamVideo = document.createElement('video');
    webcamVideo.srcObject = webcamStream;
    webcamVideo.autoplay = true;
    webcamVideo.playsInline = true;
    webcamVideo.muted = true;
    await webcamVideo.play();

    btn.textContent = '⏹ Stop Camera';
    msg.textContent = 'Camera active! Watching in real-time.';
    runWebcamLoop();
  } catch (err) {
    console.error('Webcam error', err);
    msg.textContent = 'Camera permission denied or camera not found.';
  }
}

function stopWebcamMirror() {
  if (camAnimationId) {
    cancelAnimationFrame(camAnimationId);
    camAnimationId = null;
  }
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
  const btn = $('#cam-start-btn');
  if (btn) btn.textContent = '🎥 Start Camera Mirror';
  const msg = $('#cam-msg');
  if (msg) msg.textContent = 'Camera stopped.';
}

function runWebcamLoop() {
  const camCv = $('#cam-stage');
  if (!camCv || !webcamVideo) return;
  const ctx = camCv.getContext('2d');
  const w = camCv.width;
  const h = camCv.height;

  function renderCamFrame() {
    if (!webcamStream || webcamVideo.paused || webcamVideo.ended) return;

    const cell = parseInt($('#cam-cell').value, 10);
    const filter = $('#cam-filter').value;
    const cols = Math.floor(w / cell);
    const rows = Math.floor(h / cell);

    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(webcamVideo, 0, 0, cols, rows);
    const imgData = offCtx.getImageData(0, 0, cols, rows).data;

    ctx.fillStyle = '#09060f';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        let r = imgData[idx];
        let g = imgData[idx + 1];
        let b = imgData[idx + 2];

        if (filter === 'cyberpunk') {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          r = Math.min(255, Math.floor(lum * 255 + 40));
          g = Math.floor(lum * 60);
          b = Math.min(255, Math.floor((1 - lum) * 120 + 135));
        } else if (filter === 'gameboy') {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (lum < 0.25) [r, g, b] = [15, 56, 15];
          else if (lum < 0.5) [r, g, b] = [48, 98, 48];
          else if (lum < 0.75) [r, g, b] = [139, 172, 15];
          else [r, g, b] = [155, 188, 15];
        } else if (filter === 'noir') {
          const lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
          r = g = b = lum;
        } else if (filter === 'matrix') {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          r = 0;
          g = Math.min(255, Math.floor(lum * 255 + 60));
          b = Math.floor(lum * 40);
        }

        const px = x * cell + cell / 2;
        const py = y * cell + cell / 2;
        const rad = (cell / 2) * 0.9;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    applyRetroFX(ctx, w, h, performance.now());
    camAnimationId = requestAnimationFrame(renderCamFrame);
  }

  renderCamFrame();
}

if ($('#cam-start-btn')) $('#cam-start-btn').onclick = startWebcamMirror;
if ($('#cam-cell')) {
  $('#cam-cell').oninput = () => {
    $('#cam-cellv').textContent = `${$('#cam-cell').value} px`;
  };
}

if ($('#cam-snap')) {
  $('#cam-snap').onclick = () => {
    const camCv = $('#cam-stage');
    camCv.toBlob(blob => saveFile(blob, `pixel-mirror-${Date.now()}.png`));
    $('#cam-msg').textContent = 'Captured still art snapshot!';
  };
}

if ($('#cam-rec')) {
  $('#cam-rec').onclick = () => {
    if (isCamRecording) return;
    const camCv = $('#cam-stage');
    const stream = camCv.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      saveFile(blob, `pixel-mirror-${Date.now()}.webm`);
      isCamRecording = false;
      $('#cam-rec-label').textContent = 'Record 5s Reel';
      $('#cam-msg').textContent = 'Recorded and saved 5-second video!';
    };

    recorder.start();
    isCamRecording = true;
    let remaining = 5;
    $('#cam-rec-label').textContent = `Recording (${remaining}s)...`;
    const countdown = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        $('#cam-rec-label').textContent = `Recording (${remaining}s)...`;
      } else {
        clearInterval(countdown);
        recorder.stop();
      }
    }, 1000);
  };
}

// Initialize Studio
setAspectRatio('1:1');
initBeforeAfter();
requestAnimationFrame(animationLoop);
