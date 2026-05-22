# Image to ASCII & Pixel Art

A single-page web studio that turns photos into **ASCII art** or **pixel art** — entirely in the browser. No install, no server, and no uploads: your images never leave your device.

**[Open the app →](index.html)** · [GitHub](https://github.com/josephbarralquinteros/varios) · [MIT License](LICENSE)

---

## What it does

| Mode | Description |
|------|-------------|
| **ASCII Art** | Maps image brightness to text characters (dense sets, blocks, braille, and more). Optional color preview, dithering, gamma, and sharpening. Export as plain text. |
| **Pixel Art** | Processes images at **full original resolution by default**, then lets you **reduce** resolution with a slider for a retro pixel look. Palette reduction, dithering, and crisp PNG export. |

Both modes update live as you tweak settings. Load an image from disk or **paste** from the clipboard (`Ctrl+V` / `Cmd+V`).

---

## Quick start

1. Clone or download this repository. or visit (https://asciijb.netlify.app/)
2. Open **`index.html`** in Chrome, Firefox, Edge, or Safari.
3. Choose **ASCII Art** or **Pixel Art**, select an image, adjust settings, download or copy the result.

No `npm install`, no build step, no backend.

---

## Files

| File | Role |
|------|------|
| [`index.html`](index.html) | UI, styles, tabs, footer |
| [`script.js`](script.js) | ASCII conversion engine |
| [`pixel.js`](pixel.js) | Pixel art engine |
| [`LICENSE`](LICENSE) | MIT license |

---

## ASCII Art

- **Styles:** Dense (70+ levels), blocks, braille (2× horizontal detail), standard, simple, minimal
- **Color preview** — keeps original hues on each character (often the most readable option)
- Optional black & white pass, Floyd–Steinberg dithering, contrast, gamma, sharpness
- **Copy to clipboard** or download `.txt`
- Width in characters (40–300); height follows aspect ratio automatically

**Tips:** Use *Dense* or *Braille* at width 140–200. Enable color preview for photos and portraits.

---

## Pixel Art

- **Default output = 100%** of the uploaded image’s width and height (true native resolution)
- **Resolution slider (5–100%)** — only lowers size when you want a blockier look
- Area averaging when downscaling; direct per-pixel processing at 100%
- K-means palette (2–256 colors) with optional dithering
- Contrast, saturation, sharpness, light smoothing
- **Auto-fit preview** scales the canvas view without changing export size
- Download PNG at output dimensions (not preview zoom)

**Tips:** Start at 100% for maximum detail. For retro style, try 25–50% resolution with 8–32 colors and dithering on.

> Very large images (e.g. 6000×4000) may take longer to process. The app shows a notice; lower the resolution % if needed.

---

## Privacy

All processing uses the Canvas API in your browser. Images are not sent to any server.

---

## Supported formats

Any image format your browser can decode: PNG, JPEG, WebP, GIF, BMP, etc.

---

## License

[MIT](LICENSE) — Copyright (c) 2025–2026 Joseph Barral Quinteros
