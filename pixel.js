// Pixel art — client-side converter (native resolution by default)
const pixelResolution = document.getElementById('pixelResolution');
const pixelColors = document.getElementById('pixelColors');
const pixelZoom = document.getElementById('pixelZoom');
const pixelZoomAuto = document.getElementById('pixelZoomAuto');
const pixelSharpen = document.getElementById('pixelSharpen');
const pixelContrast = document.getElementById('pixelContrast');
const pixelSaturation = document.getElementById('pixelSaturation');
const pixelDither = document.getElementById('pixelDither');
const pixelSmooth = document.getElementById('pixelSmooth');
const pixelCanvas = document.getElementById('pixelCanvas');
const pixelOriginalPreview = document.getElementById('pixelOriginalPreview');
const pixelDownloadBtn = document.getElementById('pixelDownloadBtn');
const pixelGridInfo = document.getElementById('pixelGridInfo');
const pixelDimensionsLabel = document.getElementById('pixelDimensionsLabel');
const pixelNativeBadge = document.getElementById('pixelNativeBadge');

const pixelCtx = pixelCanvas.getContext('2d', { willReadFrequently: true });

let pixelSourceImage = null;
let pixelNativeW = 0;
let pixelNativeH = 0;
let pixelGridW = 0;
let pixelGridH = 0;
let lastPixelImageData = null;

const pixelControls = [
    pixelResolution, pixelColors, pixelZoom, pixelSharpen,
    pixelContrast, pixelSaturation, pixelDither, pixelSmooth,
];

const MAX_CANVAS_PIXELS = 16_777_216; // ~4096² — typical browser limit

function getPixelLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function clamp255(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
}

function applyPixelTone(r, g, b, contrast, saturation) {
    let lr = 128 + (r - 128) * contrast;
    let lg = 128 + (g - 128) * contrast;
    let lb = 128 + (b - 128) * contrast;
    const gray = getPixelLuminance(lr, lg, lb);
    lr = gray + (lr - gray) * saturation;
    lg = gray + (lg - gray) * saturation;
    lb = gray + (lb - gray) * saturation;
    return [clamp255(lr), clamp255(lg), clamp255(lb)];
}

function getOutputDimensions() {
    const pct = parseInt(pixelResolution?.value || 100, 10) / 100;
    return {
        w: Math.max(1, Math.round(pixelNativeW * pct)),
        h: Math.max(1, Math.round(pixelNativeH * pct)),
        pct: Math.round(pct * 100),
    };
}

function processAtNativeResolution(srcImage, toneOpts, colorCount, sharpen, smooth, dither) {
    const w = srcImage.width;
    const h = srcImage.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(srcImage, 0, 0);

    let imageData = ctx.getImageData(0, 0, w, h);
    const { contrast, saturation } = toneOpts;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        [data[i], data[i + 1], data[i + 2]] = applyPixelTone(
            data[i], data[i + 1], data[i + 2], contrast, saturation
        );
    }

    if (smooth) imageData = boxBlur(imageData, 1);
    if (sharpen > 0) imageData = unsharpPixel(imageData, sharpen);
    if (colorCount < 256) imageData = quantizeKMeans(imageData, colorCount, dither);

    return imageData;
}

function downscaleAverage(srcImage, outW, outH, toneOpts) {
    const src = document.createElement('canvas');
    src.width = srcImage.width;
    src.height = srcImage.height;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(srcImage, 0, 0);

    const srcData = sctx.getImageData(0, 0, src.width, src.height).data;
    const out = new ImageData(outW, outH);
    const sw = src.width;
    const sh = src.height;
    const { contrast, saturation } = toneOpts;

    for (let y = 0; y < outH; y++) {
        const y0 = Math.floor((y * sh) / outH);
        const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / outH));
        for (let x = 0; x < outW; x++) {
            const x0 = Math.floor((x * sw) / outW);
            const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / outW));
            let r = 0, g = 0, b = 0, n = 0;
            for (let sy = y0; sy < y1; sy++) {
                for (let sx = x0; sx < x1; sx++) {
                    const i = (sy * sw + sx) * 4;
                    r += srcData[i];
                    g += srcData[i + 1];
                    b += srcData[i + 2];
                    n++;
                }
            }
            r /= n; g /= n; b /= n;
            [r, g, b] = applyPixelTone(r, g, b, contrast, saturation);
            const o = (y * outW + x) * 4;
            out.data[o] = r;
            out.data[o + 1] = g;
            out.data[o + 2] = b;
            out.data[o + 3] = 255;
        }
    }
    return out;
}

function colorDist(a, b) {
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return dr * dr + dg * dg + db * db;
}

function quantizeKMeans(imageData, k, dither) {
    const { width, height, data } = imageData;
    const pixels = [];
    const step = Math.max(1, Math.floor((width * height) / 12000));
    for (let i = 0; i < data.length; i += 4 * step) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (pixels.length === 0) return imageData;

    k = Math.max(2, Math.min(k, pixels.length));
    const centroids = [];
    const used = new Set();
    while (centroids.length < k) {
        const idx = Math.floor(Math.random() * pixels.length);
        if (used.has(idx)) continue;
        used.add(idx);
        centroids.push(pixels[idx].slice());
    }

    const assignments = new Uint16Array(pixels.length);
    for (let iter = 0; iter < 14; iter++) {
        let moved = false;
        for (let i = 0; i < pixels.length; i++) {
            let best = 0;
            let bestD = Infinity;
            for (let c = 0; c < centroids.length; c++) {
                const d = colorDist(pixels[i], centroids[c]);
                if (d < bestD) {
                    bestD = d;
                    best = c;
                }
            }
            if (assignments[i] !== best) moved = true;
            assignments[i] = best;
        }
        if (!moved && iter > 2) break;

        const sums = centroids.map(() => [0, 0, 0, 0]);
        for (let i = 0; i < pixels.length; i++) {
            const a = assignments[i];
            sums[a][0] += pixels[i][0];
            sums[a][1] += pixels[i][1];
            sums[a][2] += pixels[i][2];
            sums[a][3]++;
        }
        for (let c = 0; c < centroids.length; c++) {
            if (sums[c][3] === 0) continue;
            centroids[c][0] = sums[c][0] / sums[c][3];
            centroids[c][1] = sums[c][1] / sums[c][3];
            centroids[c][2] = sums[c][2] / sums[c][3];
        }
    }

    const out = new ImageData(width, height);
    const errR = new Float32Array(width * height);
    const errG = new Float32Array(width * height);
    const errB = new Float32Array(width * height);

    const findNearest = (r, g, b) => {
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < centroids.length; c++) {
            const d = colorDist([r, g, b], centroids[c]);
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        return best;
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const i = idx * 4;
            let r = data[i] + errR[idx];
            let g = data[i + 1] + errG[idx];
            let b = data[i + 2] + errB[idx];
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            const ci = findNearest(r, g, b);
            const cr = centroids[ci][0];
            const cg = centroids[ci][1];
            const cb = centroids[ci][2];

            out.data[i] = Math.round(cr);
            out.data[i + 1] = Math.round(cg);
            out.data[i + 2] = Math.round(cb);
            out.data[i + 3] = 255;

            if (dither) {
                const er = r - cr;
                const eg = g - cg;
                const eb = b - cb;
                const spread = (nx, ny, f) => {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const ni = ny * width + nx;
                        errR[ni] += er * f;
                        errG[ni] += eg * f;
                        errB[ni] += eb * f;
                    }
                };
                spread(x + 1, y, 7 / 16);
                spread(x - 1, y + 1, 3 / 16);
                spread(x, y + 1, 5 / 16);
                spread(x + 1, y + 1, 1 / 16);
            }
        }
    }
    return out;
}

function unsharpPixel(imageData, amount) {
    if (amount <= 0) return imageData;
    const { width, height, data } = imageData;
    const copy = new Uint8ClampedArray(data);
    const out = new Uint8ClampedArray(data);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                let ki = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += copy[((y + ky) * width + (x + kx)) * 4 + c] * kernel[ki++];
                    }
                }
                const idx = (y * width + x) * 4 + c;
                out[idx] = clamp255(copy[idx] + (sum - copy[idx]) * amount);
            }
            out[(y * width + x) * 4 + 3] = 255;
        }
    }
    return new ImageData(out, width, height);
}

function boxBlur(imageData, radius) {
    const { width, height, data } = imageData;
    const out = new Uint8ClampedArray(data);
    for (let pass = 0; pass < radius; pass++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, n = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                        const i = (ny * width + nx) * 4;
                        r += data[i]; g += data[i + 1]; b += data[i + 2];
                        n++;
                    }
                }
                const o = (y * width + x) * 4;
                out[o] = r / n;
                out[o + 1] = g / n;
                out[o + 2] = b / n;
                out[o + 3] = 255;
            }
        }
        data.set(out);
    }
    return new ImageData(out, width, height);
}

function computeFitZoom(gridW, gridH) {
    const viewport = document.querySelector('.pixel-viewport');
    if (!viewport) return 1;
    const pad = 48;
    const maxW = viewport.clientWidth - pad;
    const maxH = Math.min(viewport.clientHeight || 480, window.innerHeight * 0.55) - pad;
    if (gridW <= maxW && gridH <= maxH) return 1;
    return Math.max(1, Math.floor(Math.min(maxW / gridW, maxH / gridH)));
}

function renderPixelArt() {
    if (!pixelSourceImage) return;

    const { w: gridW, h: gridH, pct } = getOutputDimensions();
    pixelGridW = gridW;
    pixelGridH = gridH;

    const contrast = parseFloat(pixelContrast.value);
    const saturation = parseFloat(pixelSaturation.value);
    const colorCount = parseInt(pixelColors.value, 10);
    let zoom = parseInt(pixelZoom.value, 10);
    const sharpen = parseFloat(pixelSharpen.value);
    const toneOpts = { contrast, saturation };

    let imageData;

    if (pct === 100) {
        imageData = processAtNativeResolution(
            pixelSourceImage,
            toneOpts,
            colorCount,
            sharpen,
            pixelSmooth?.checked,
            pixelDither?.checked
        );
    } else {
        imageData = downscaleAverage(pixelSourceImage, gridW, gridH, toneOpts);
        if (pixelSmooth?.checked) imageData = boxBlur(imageData, 1);
        if (sharpen > 0) imageData = unsharpPixel(imageData, sharpen);
        if (colorCount < 256) {
            imageData = quantizeKMeans(imageData, colorCount, pixelDither?.checked);
        }
    }

    lastPixelImageData = imageData;

    const small = document.createElement('canvas');
    small.width = gridW;
    small.height = gridH;
    small.getContext('2d').putImageData(imageData, 0, 0);

    if (pixelZoomAuto?.checked) {
        const fit = computeFitZoom(gridW, gridH);
        if (pixelZoom) {
            pixelZoom.value = fit;
            const label = document.getElementById('pixelZoomVal');
            if (label) label.textContent = fit;
        }
        zoom = fit;
    }

    pixelCanvas.width = gridW * zoom;
    pixelCanvas.height = gridH * zoom;
    pixelCtx.imageSmoothingEnabled = false;
    pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
    pixelCtx.drawImage(small, 0, 0, pixelCanvas.width, pixelCanvas.height);

    updatePixelLabels(gridW, gridH, pct, colorCount, zoom);
}

function updatePixelLabels(gridW, gridH, pct, colorCount, zoom) {
    if (pixelGridInfo) {
        const nativeTag = pct === 100 ? ' · original resolution' : '';
        pixelGridInfo.textContent = `${gridW} × ${gridH} px · ${colorCount} colors · ${zoom}× preview${nativeTag}`;
    }
    if (pixelDimensionsLabel) {
        pixelDimensionsLabel.textContent =
            `${gridW} × ${gridH} — ${pct}% of ${pixelNativeW} × ${pixelNativeH}`;
    }
    if (pixelNativeBadge) {
        pixelNativeBadge.hidden = pct !== 100;
    }
}

function showPixelOriginalPreview(img) {
    if (!pixelOriginalPreview) return;
    const max = 280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    pixelOriginalPreview.width = Math.round(img.width * scale);
    pixelOriginalPreview.height = Math.round(img.height * scale);
    pixelOriginalPreview.getContext('2d').drawImage(
        img, 0, 0, pixelOriginalPreview.width, pixelOriginalPreview.height
    );
}

function setPixelSourceImage(img) {
    pixelSourceImage = img;
    pixelNativeW = img.width;
    pixelNativeH = img.height;

    const sizeEl = document.getElementById('pixelSourceSize');
    if (sizeEl) sizeEl.textContent = `${img.width}×${img.height}`;

    if (pixelResolution) {
        pixelResolution.value = 100;
        pixelResolution.disabled = false;
    }

    if (pixelZoom && pixelZoomAuto?.checked) {
        pixelZoom.disabled = true;
    }

    const totalPixels = pixelNativeW * pixelNativeH;
    const warnEl = document.getElementById('pixelLargeWarn');
    if (warnEl) {
        warnEl.hidden = totalPixels <= MAX_CANVAS_PIXELS;
        if (!warnEl.hidden) {
            warnEl.textContent =
                `Large image (${pixelNativeW}×${pixelNativeH}). Processing may be slow; lower resolution % if needed.`;
        }
    }

    showPixelOriginalPreview(img);
    const pixelDownloadNativeBtn = document.getElementById('pixelDownloadNativeBtn');
    if (pixelDownloadBtn) pixelDownloadBtn.disabled = false;
    if (pixelDownloadNativeBtn) pixelDownloadNativeBtn.disabled = false;

    updatePixelRangeLabels();
    renderPixelArt();
}

function downloadPixelPng() {
    if (!lastPixelImageData) return;
    const link = document.createElement('a');
    link.download = 'pixel_art.png';
    link.href = pixelCanvas.toDataURL('image/png');
    link.click();
}

function downloadPixelNative() {
    if (!lastPixelImageData) return;
    const small = document.createElement('canvas');
    small.width = pixelGridW;
    small.height = pixelGridH;
    small.getContext('2d').putImageData(lastPixelImageData, 0, 0);
    const link = document.createElement('a');
    link.download = `pixel_art_${pixelGridW}x${pixelGridH}.png`;
    link.href = small.toDataURL('image/png');
    link.click();
}

pixelControls.forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => {
        if (pixelSourceImage) renderPixelArt();
        updatePixelRangeLabels();
    });
    el.addEventListener('change', () => {
        if (pixelSourceImage) renderPixelArt();
    });
});

if (pixelZoomAuto) {
    pixelZoomAuto.addEventListener('change', () => {
        if (pixelZoom) pixelZoom.disabled = pixelZoomAuto.checked;
        if (pixelSourceImage) renderPixelArt();
    });
}

function updatePixelRangeLabels() {
    const pct = pixelResolution?.value ?? 100;
    const map = {
        pixelResolutionVal: pct,
        pixelColorsVal: pixelColors?.value,
        pixelZoomVal: pixelZoom?.value,
        pixelSharpenVal: pixelSharpen?.value,
        pixelContrastVal: pixelContrast?.value,
        pixelSaturationVal: pixelSaturation?.value,
    };
    Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.textContent = val;
    });
    if (pixelDimensionsLabel && pixelNativeW) {
        const { w, h } = getOutputDimensions();
        pixelDimensionsLabel.textContent =
            `${w} × ${h} — ${pct}% of ${pixelNativeW} × ${pixelNativeH}`;
    }
}

const pixelDownloadNativeBtn = document.getElementById('pixelDownloadNativeBtn');
if (pixelDownloadBtn) pixelDownloadBtn.addEventListener('click', downloadPixelPng);
if (pixelDownloadNativeBtn) pixelDownloadNativeBtn.addEventListener('click', downloadPixelNative);

document.addEventListener('app:imageLoaded', (e) => {
    setPixelSourceImage(e.detail.img);
});

window.addEventListener('resize', () => {
    if (pixelSourceImage && pixelZoomAuto?.checked) renderPixelArt();
});

updatePixelRangeLabels();
