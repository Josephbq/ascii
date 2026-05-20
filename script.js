// Elementos del DOM
const imageInput = document.getElementById('imageInput');
const originalCanvas = document.getElementById('originalCanvas');
const bwCanvas = document.getElementById('bwCanvas');
const bwBox = document.getElementById('bwBox');
const asciiOutput = document.getElementById('asciiOutput');
const asciiViewport = document.getElementById('asciiViewport');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const asciiWidthInput = document.getElementById('asciiWidth');
const contrastInput = document.getElementById('contrast');
const gammaInput = document.getElementById('gamma');
const useBlackAndWhite = document.getElementById('useBlackAndWhite');
const asciiStyle = document.getElementById('asciiStyle');
const useDithering = document.getElementById('useDithering');
const invertColors = document.getElementById('invertColors');
const useColorAscii = document.getElementById('useColorAscii');
const sharpenInput = document.getElementById('sharpen');

// Caracteres de oscuro → claro (más pasos = más detalle)
const asciiStyles = {
    dense: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\' .',
    standard: '@%#*+=-:. ',
    simple: '@#*+-. ',
    blocks: '█▓▒░ ',
    minimal: '█▄▌▐▀ ',
};

const CHAR_ASPECT = 0.55; // altura/ancho visual de un carácter en terminal

const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
const bwCtx = bwCanvas.getContext('2d', { willReadFrequently: true });

let originalImage = null;
let bwImageData = null;
let lastAsciiPlain = '';

imageInput.addEventListener('change', handleImageSelect);
convertBtn.addEventListener('click', copyToClipboard);
downloadBtn.addEventListener('click', downloadAscii);
useBlackAndWhite.addEventListener('change', updatePreview);
contrastInput.addEventListener('input', updatePreview);
gammaInput.addEventListener('input', updatePreview);
sharpenInput.addEventListener('input', updatePreview);
useDithering.addEventListener('change', updatePreview);
invertColors.addEventListener('change', updatePreview);
useColorAscii.addEventListener('change', updatePreview);
asciiStyle.addEventListener('change', updatePreview);
asciiWidthInput.addEventListener('input', updatePreview);

function getLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function applyTone(value, contrast, gamma, invert) {
    let v = 128 + (value - 128) * contrast;
    v = Math.max(0, Math.min(255, v));
    v = Math.pow(v / 255, gamma) * 255;
    if (invert) v = 255 - v;
    return v;
}

function loadImageForAscii(img) {
    const maxPreview = 480;
    const scale = Math.min(1, maxPreview / Math.max(img.width, img.height));
    originalCanvas.width = Math.round(img.width * scale);
    originalCanvas.height = Math.round(img.height * scale);
    originalCtx.imageSmoothingEnabled = true;
    originalCtx.imageSmoothingQuality = 'high';
    originalCtx.drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);

    originalImage = img;
    convertBtn.disabled = false;
    downloadBtn.disabled = false;
    updatePreview();
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            loadImageForAscii(img);
            document.dispatchEvent(new CustomEvent('app:imageLoaded', { detail: { img } }));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('app:imageLoaded', (e) => {
    if (!e.detail?.img || originalImage === e.detail.img) return;
    loadImageForAscii(e.detail.img);
});

function updatePreview() {
    if (!originalImage) return;

    bwBox.style.display = useBlackAndWhite.checked ? '' : 'none';

    if (useBlackAndWhite.checked) {
        convertToBlackAndWhite(originalImage);
    }

    convertToAscii();
}

function convertToBlackAndWhite(img) {
    const maxPreview = 480;
    const scale = Math.min(1, maxPreview / Math.max(img.width, img.height));
    bwCanvas.width = Math.round(img.width * scale);
    bwCanvas.height = Math.round(img.height * scale);
    bwCtx.drawImage(img, 0, 0, bwCanvas.width, bwCanvas.height);

    const imageData = bwCtx.getImageData(0, 0, bwCanvas.width, bwCanvas.height);
    const data = imageData.data;
    const contrast = parseFloat(contrastInput.value);
    const gamma = parseFloat(gammaInput.value);
    const invert = invertColors.checked;

    for (let i = 0; i < data.length; i += 4) {
        const luma = getLuminance(data[i], data[i + 1], data[i + 2]);
        const v = applyTone(luma, contrast, gamma, invert);
        data[i] = data[i + 1] = data[i + 2] = v;
    }

    bwImageData = imageData;
    bwCtx.putImageData(imageData, 0, 0);
}

function getSourceCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);

    if (useBlackAndWhite.checked) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const contrast = parseFloat(contrastInput.value);
        const gamma = parseFloat(gammaInput.value);
        const invert = invertColors.checked;
        for (let i = 0; i < data.length; i += 4) {
            const luma = getLuminance(data[i], data[i + 1], data[i + 2]);
            const v = applyTone(luma, contrast, gamma, invert);
            data[i] = data[i + 1] = data[i + 2] = v;
        }
        ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
}

function getBrailleChar(block) {
    let code = 0x2800;
    for (let i = 0; i < 8; i++) {
        if (block[i]) code |= 1 << i;
    }
    return String.fromCharCode(code);
}

function sampleBlock(data, width, height, x0, y0, w, h) {
    let r = 0, g = 0, b = 0, n = 0;
    const x1 = Math.min(width, x0 + w);
    const y1 = Math.min(height, y0 + h);
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const i = (y * width + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
        }
    }
    if (!n) return { r: 0, g: 0, b: 0, luma: 0 };
    r /= n; g /= n; b /= n;
    return { r, g, b, luma: getLuminance(r, g, b) };
}

function buildPixelGrid(sourceCanvas, charWidth, charHeight, pxPerCharX, pxPerCharY) {
    const pxW = charWidth * pxPerCharX;
    const pxH = charHeight * pxPerCharY;
    const temp = document.createElement('canvas');
    temp.width = pxW;
    temp.height = pxH;
    const ctx = temp.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, pxW, pxH);

    let imageData = ctx.getImageData(0, 0, pxW, pxH);
    const sharpen = parseFloat(sharpenInput.value);
    if (sharpen > 0) {
        imageData = unsharpMask(imageData, sharpen);
    }

    return { data: imageData.data, pxW, pxH, charWidth, charHeight, pxPerCharX, pxPerCharY };
}

function unsharpMask(imageData, amount) {
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
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += copy[idx] * kernel[ki++];
                    }
                }
                const idx = (y * width + x) * 4 + c;
                out[idx] = Math.max(0, Math.min(255, copy[idx] + (sum - copy[idx]) * amount));
            }
            out[(y * width + x) * 4 + 3] = 255;
        }
    }
    return new ImageData(out, width, height);
}

function mapLumaToCharIndex(luma, charsLen) {
    const t = luma / 255;
    return Math.min(charsLen - 1, Math.floor((1 - t) * (charsLen - 1)));
}

function convertToAsciiBraille(grid) {
    const { data, pxW, charWidth, charHeight } = grid;
    const threshold = 128;
    let ascii = '';
    let html = '';

    for (let cy = 0; cy < charHeight; cy++) {
        for (let cx = 0; cx < charWidth; cx++) {
            const block = [];
            for (let dy = 0; dy < 4; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const px = cx * 2 + dx;
                    const py = cy * 4 + dy;
                    const offset = (py * pxW + px) * 4;
                    const luma = getLuminance(data[offset], data[offset + 1], data[offset + 2]);
                    block.push(luma < threshold ? 1 : 0);
                }
            }
            const ch = getBrailleChar(block);
            ascii += ch;
            if (useColorAscii.checked && !useBlackAndWhite.checked) {
                const sample = sampleBlock(data, pxW, grid.pxH, cx * 2, cy * 4, 2, 4);
                const color = `rgb(${Math.round(sample.r)},${Math.round(sample.g)},${Math.round(sample.b)})`;
                html += `<span style="color:${color}">${escapeHtml(ch)}</span>`;
            } else {
                html += escapeHtml(ch);
            }
        }
        ascii += '\n';
        html += '\n';
    }
    return { ascii, html };
}

function convertToAsciiClassic(grid, chars) {
    const { data, pxW, pxH, charWidth, charHeight, pxPerCharX, pxPerCharY } = grid;
    const contrast = parseFloat(contrastInput.value);
    const gamma = parseFloat(gammaInput.value);
    const invert = invertColors.checked;
    const dither = useDithering.checked;

    const lumas = new Float32Array(charWidth * charHeight);
    const colors = [];

    for (let cy = 0; cy < charHeight; cy++) {
        for (let cx = 0; cx < charWidth; cx++) {
            const sample = sampleBlock(
                data, pxW, pxH,
                cx * pxPerCharX, cy * pxPerCharY,
                pxPerCharX, pxPerCharY
            );
            let luma = applyTone(sample.luma, contrast, gamma, invert);
            lumas[cy * charWidth + cx] = luma;
            colors.push(sample);
        }
    }

    let ascii = '';
    let html = '';
    const errBuf = new Float32Array(charWidth * charHeight);

    for (let cy = 0; cy < charHeight; cy++) {
        for (let cx = 0; cx < charWidth; cx++) {
            const idx = cy * charWidth + cx;
            let luma = lumas[idx] + errBuf[idx];
            luma = Math.max(0, Math.min(255, luma));

            const charIndex = mapLumaToCharIndex(luma, chars.length);
            const ch = chars[charIndex];
            ascii += ch;

            if (useColorAscii.checked && !useBlackAndWhite.checked) {
                const c = colors[idx];
                const color = `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
                html += `<span style="color:${color}">${escapeHtml(ch)}</span>`;
            } else {
                const gray = Math.round(255 - (charIndex / (chars.length - 1)) * 255);
                html += `<span style="color:rgb(${gray},${gray},${gray})">${escapeHtml(ch)}</span>`;
            }

            if (dither) {
                const oldLuma = lumas[idx];
                const newLuma = 255 - (charIndex / (chars.length - 1)) * 255;
                const err = luma - newLuma;
                distributeError(errBuf, charWidth, charHeight, cx, cy, err);
            }
        }
        ascii += '\n';
        html += '\n';
    }
    return { ascii, html };
}

function distributeError(buf, w, h, x, y, err) {
    const add = (nx, ny, factor) => {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            buf[ny * w + nx] += err * factor;
        }
    };
    add(x + 1, y, 7 / 16);
    add(x - 1, y + 1, 3 / 16);
    add(x, y + 1, 5 / 16);
    add(x + 1, y + 1, 1 / 16);
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertToAscii() {
    if (!originalImage) return;

    const style = asciiStyle.value;
    const charWidth = parseInt(asciiWidthInput.value, 10);
    const isBraille = style === 'braille';

    const pxPerCharX = isBraille ? 2 : 1;
    const pxPerCharY = isBraille ? 4 : 2;

    const charHeight = Math.max(
        1,
        Math.round((originalImage.height / originalImage.width) * charWidth * CHAR_ASPECT)
    );

    const sourceCanvas = getSourceCanvas();
    const grid = buildPixelGrid(sourceCanvas, charWidth, charHeight, pxPerCharX, pxPerCharY);

    let result;
    if (isBraille) {
        result = convertToAsciiBraille(grid);
    } else {
        const chars = asciiStyles[style] || asciiStyles.dense;
        result = convertToAsciiClassic(grid, chars);
    }

    lastAsciiPlain = result.ascii;
    asciiOutput.innerHTML = result.html;
    fitAsciiFontSize();
}

function fitAsciiFontSize() {
    if (!asciiViewport || !lastAsciiPlain) return;
    const lines = lastAsciiPlain.split('\n');
    const cols = Math.max(...lines.map((l) => l.length), 1);
    const rows = lines.length;
    const pad = 32;
    const maxW = asciiViewport.clientWidth - pad;
    const maxH = asciiViewport.clientHeight - pad;
    const sizeByW = maxW / (cols * 0.6);
    const sizeByH = maxH / rows;
    const size = Math.max(3, Math.min(14, Math.floor(Math.min(sizeByW, sizeByH))));
    asciiOutput.style.fontSize = `${size}px`;
}

window.addEventListener('resize', fitAsciiFontSize);

async function copyToClipboard() {
    const ascii = lastAsciiPlain;
    if (!ascii) return;

    try {
        await navigator.clipboard.writeText(ascii);
        const originalText = convertBtn.textContent;
        convertBtn.textContent = '¡Copiado!';
        setTimeout(() => {
            convertBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('Error al copiar al portapapeles');
    }
}

function downloadAscii() {
    const ascii = lastAsciiPlain;
    if (!ascii) return;

    const blob = new Blob([ascii], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii_art.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
