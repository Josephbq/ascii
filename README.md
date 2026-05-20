# Image to ASCII & Pixel Art

Convert images into detailed **ASCII art** or high-resolution **pixel art** using a browser-based web app, or optional Python CLI tools.

## Web app (recommended)

Open [`index.html`](index.html) in any modern browser. No install, no server, and no uploads — processing runs entirely on your device.

### ASCII Art tab

- Multiple character sets: dense, blocks, braille, standard, and more
- Optional black & white conversion before rendering
- Color preview, dithering, gamma, contrast, and sharpening
- Live preview with automatic font scaling
- Copy to clipboard or download as `.txt`

### Pixel Art tab

- High-detail grid up to **512 px** wide (height scales with aspect ratio)
- Area-average downsampling for accurate per-pixel colors
- **K-means** palette reduction (2–256 colors) with optional Floyd–Steinberg dithering
- Contrast, saturation, and sharpness controls
- Crisp preview with checkerboard background and pixelated scaling
- Download preview PNG (zoomed) or native 1× resolution PNG

### Quick tips

| Goal | Suggestion |
|------|------------|
| Recognizable ASCII | Use **Dense** or **Braille**, enable color preview, width 140–200 |
| Retro pixel look | Grid 128–256, palette 8–32 colors, dithering on |
| Maximum pixel detail | Grid width 384–512, palette 64–128 colors |
| Sharp edges | Increase sharpness slightly; disable smoothing |

## Python CLI tools

Legacy command-line scripts are included for terminal workflows.

### Requirements

```bash
pip install -r requirements.txt
```

For the Flask pixel-art server (`pixel_art.py`):

```bash
pip install -r requirements_pixel.txt
```

### `arte.py` — detailed ASCII

```bash
python arte.py
```

Interactive file picker; keeps more detail with a wide character set.

### `arte_simple.py` — simplified ASCII

```bash
python arte_simple.py
```

Lower resolution, fewer characters — more abstract output.

### `pixel_art.py` — Flask pixel server

```bash
python pixel_art.py
```

Then open `http://localhost:5000`. The browser app in `index.html` offers more controls and does not require Python.

## Supported formats

PNG, JPG, JPEG, BMP, GIF, and other formats supported by the browser or Pillow.

## Project structure

| File | Description |
|------|-------------|
| `index.html` | Main web UI (ASCII + Pixel tabs) |
| `script.js` | ASCII conversion engine |
| `pixel.js` | Pixel art conversion engine |
| `arte.py` | CLI ASCII (detailed) |
| `arte_simple.py` | CLI ASCII (simple) |
| `pixel_art.py` | Flask pixel-art server |

## License

[MIT](LICENSE) — Copyright (c) 2025–2026 Joseph Barral Quinteros
