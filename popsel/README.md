# 🫧 Popsel — Mesmerizing Pixel Reveal Studio

<div align="center">

![Popsel Banner](sample1.jpg)

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![60 FPS Export](https://img.shields.io/badge/Export-60%20FPS%20Video-blue.svg)]()
[![100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side-green.svg)]()
[![Creator: Teja Priyan](https://img.shields.io/badge/Created%20by-Teja%20Priyan-ff3366.svg)](https://github.com/TejaPriyan)

**Transform any photo into a mesmerizing popping-pixel animation video.**

[🔴 Live Demo](https://tejapriya.github.io/Popsel) • [📦 Download](https://github.com/TejaPriyan/Popsel/archive/refs/heads/main.zip) • [🐛 Report Bug](https://github.com/TejaPriyan/Popsel/issues)

</div>

---

## ✨ What is Popsel?

**Popsel** is a high-performance, 100% browser-based creative studio that turns ordinary photos into satisfying **popping-pixel reveal animations**. Each pixel bursts into existence with configurable physics, geometric shapes, and aesthetic retro filters. Export as **60 FPS MP4/WebM video**, **animated GIF stickers**, or **HD PNG stills**.

> 🔒 **100% private.** Your photos never leave your device. All rendering, particle physics, and video encoding happen entirely in your browser.

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| 🫧 **Pop Solo Mode** | Single photo pixel reveal with customizable particle physics |
| 🎞️ **Slideshow Reel** | Queue multiple photos for a continuous story reel video |
| ↔️ **Before & After** | Draggable pixel wipe comparison between original and pixelated |
| 🎨 **6 Aesthetic Filters** | Tokyo Cyberpunk, GameBoy 1989, Lofi Sunset, Cinema Noir, Matrix, Vaporwave |
| ⚡ **7 Reveal Physics** | Random Scatter, Sweep Left-to-Right, Sweep Top-to-Bottom, Ripple Wave, Spiral, Shadows First, Contour Outlines |
| 🔷 **7 Dot Shapes** | Bubble Circle, Retro Square, Diamond, Hexagon, Star, Cross, Heart |
| 📺 **Retro FX Engine** | CRT Scanlines, RGB Split (Chroma), VHS Glitch |
| 📐 **4 Aspect Ratios** | 9:16 Story, 1:1 Square, 4:5 Feed, 16:9 Widescreen |
| 📤 **Multi-Format Export** | 60 FPS HD MP4/WebM video, Animated GIF sticker, HD PNG snapshot |
| ⌨️ **Keyboard Shortcuts** | Space to pause/play, R to replay |
| 📱 **Mobile & Laptop Optimized** | Responsive touch-friendly interface for iPhone, Android, tablets, and laptops |

---

## 🚀 Getting Started

### Option 1: Open Directly (Recommended)
```bash
# Clone the repository
git clone https://github.com/TejaPriyan/Popsel.git

# Navigate into the folder
cd Popsel/popsel

# Run a local server:
python -m http.server 3456
# Then open in browser: http://localhost:3456
```

### Option 2: Run with Node.js
```bash
npx serve ./popsel
```

---

## 🎮 How to Use

1. **Upload a photo** — drag & drop onto the canvas, click to browse, or pick one of the sample photos
2. **Choose your aspect ratio** — 9:16 for TikTok/Reels/Shorts, 1:1 for Instagram, 16:9 for YouTube
3. **Adjust physics** — pixel block size, reveal pattern, dot shape, animation duration, bounce elasticity
4. **Apply a filter or retro effect** — Cyberpunk, GameBoy, CRT Scanlines, VHS Glitch, or original colors
5. **Export** — download as a 60 FPS MP4/WebM video, animated GIF sticker, or PNG snapshot

---

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play / Pause animation |
| `R` | Replay from start |

---

## 📂 Project Structure

```
Popsel/
└── popsel/
    ├── index.html              # Main app — SEO, AEO, GEO optimized
    ├── style.css               # Full design system — dark mode, responsive
    ├── app.js                  # Core engine — canvas, particles, recording
    ├── sample1.jpg             # Sample: Portrait photo
    ├── sample2.jpg             # Sample: Landscape / nature
    ├── sample3.jpg             # Sample: Pagoda architecture
    ├── sample4.jpg             # Sample: Supercar
    ├── google87bb3bc53ec346d2.html  # Google Search Console verification
    └── README.md               # Documentation
```

---

## 🛠️ Technical Architecture

### Canvas Engine
- **Pure HTML5 Canvas 2D** — no WebGL or external library overhead
- **60 FPS requestAnimationFrame** render loop with elastic overshoot physics
- Per-pixel particle system with delay arrays, bounce-back easing, and luminance-aware spawning
- Sobel edge detection for contour-first reveal order

### Recording Engine
- `canvas.captureStream(60)` — captures canvas stream at full 60 FPS
- Automatic codec negotiation: `video/mp4` (Safari/Chrome) and `video/webm` (Firefox)
- High-definition 14 Mbps video bitrate
- Downloads as `popsel-{ratio}-{timestamp}.mp4` / `.webm`

### GIF Encoder
- Pure JavaScript LZW GIF encoder — completely client-side
- 16-frame sample at 360px for Discord/Telegram sticker size
- Palette quantization: full-color to 256-color via median-cut

---

## 🌐 SEO, AEO & GEO

Popsel is fully optimized for search engines and AI answer engines:

- **SEO**: Title tags, meta description, keywords, canonical URL, `robots` directives
- **Open Graph**: Facebook/Discord rich link previews
- **Twitter Cards**: summary_large_image cards
- **Google Verification**: `google87bb3bc53ec346d2` meta tag + HTML file
- **AEO** (Answer Engine Optimization): JSON-LD `FAQPage` schema for ChatGPT/Perplexity
- **GEO** (Generative Engine Optimization): JSON-LD `WebApplication` schema for AI search engines
- **Semantic HTML5**: Semantic landmarks and visible FAQ section for web crawlers

---

## 📱 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome / Edge (Desktop & Android) | ✅ Full 60 FPS Export |
| Safari (macOS & iOS) | ✅ Full 60 FPS Export |
| Firefox | ✅ Full 60 FPS Export |
| Samsung Internet | ✅ Full 60 FPS Export |

---

## 🔒 Privacy Guarantee

> **Popsel never uploads your photos or videos to any server.**

All processing happens locally in your browser:
- Canvas rendering — CPU/GPU local
- Video encoding — MediaRecorder API local
- GIF encoding — JavaScript local

---

## 📄 License

MIT License — free to use, modify, and distribute. Attribution appreciated.

---

## 👤 Creator

**Created by [Teja Priyan](https://github.com/TejaPriyan)**

Popsel was designed and built as an open-source, private, in-browser creative studio for digital creators, artists, content producers, and short-form video enthusiasts.

---

<div align="center">

Made with ❤️, HTML5 Canvas & MediaStream Recording API

**Popsel** — *See every pixel pop.*

</div>
