// Elementos del DOM
const imageInput = document.getElementById('imageInput');
const originalCanvas = document.getElementById('originalCanvas');
const bwCanvas = document.getElementById('bwCanvas');
const asciiOutput = document.getElementById('asciiOutput');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const asciiWidthInput = document.getElementById('asciiWidth');
const contrastInput = document.getElementById('contrast');

// Caracteres ASCII ordenados por densidad
const asciiChars = '@%#*+=-:. ';

// Contextos de canvas
const originalCtx = originalCanvas.getContext('2d');
const bwCtx = bwCanvas.getContext('2d');

// Variables globales
let originalImage = null;
let bwImageData = null;

// Event Listeners
imageInput.addEventListener('change', handleImageSelect);
convertBtn.addEventListener('click', convertToAscii);
downloadBtn.addEventListener('click', downloadAscii);

// Manejar la selección de imagen
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Mostrar imagen original
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCtx.drawImage(img, 0, 0);
            
            // Convertir a blanco y negro
            convertToBlackAndWhite(img);
            
            // Habilitar botones
            convertBtn.disabled = false;
            downloadBtn.disabled = false;
            
            // Guardar referencia a la imagen
            originalImage = img;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Convertir imagen a blanco y negro
function convertToBlackAndWhite(img) {
    // Configurar canvas
    bwCanvas.width = img.width;
    bwCanvas.height = img.height;
    
    // Dibujar imagen
    bwCtx.drawImage(img, 0, 0);
    
    // Obtener datos de la imagen
    const imageData = bwCtx.getImageData(0, 0, bwCanvas.width, bwCanvas.height);
    const data = imageData.data;
    
    // Aplicar contraste
    const contrast = parseFloat(contrastInput.value);
    
    // Convertir a blanco y negro con contraste
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const adjusted = 128 + (avg - 128) * contrast;
        const value = Math.max(0, Math.min(255, adjusted));
        
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
    }
    
    // Guardar datos de la imagen en blanco y negro
    bwImageData = imageData;
    
    // Mostrar resultado
    bwCtx.putImageData(imageData, 0, 0);
}

// Convertir a ASCII
function convertToAscii() {
    if (!bwImageData) return;
    
    const width = parseInt(asciiWidthInput.value);
    const height = Math.floor((bwImageData.height * width) / bwImageData.width);
    
    // Crear canvas temporal para redimensionar
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Redimensionar imagen
    tempCtx.drawImage(bwCanvas, 0, 0, width, height);
    const resizedData = tempCtx.getImageData(0, 0, width, height);
    
    // Convertir a ASCII
    let ascii = '';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const brightness = resizedData.data[index];
            const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
            ascii += asciiChars[charIndex];
        }
        ascii += '\n';
    }
    
    // Mostrar resultado
    asciiOutput.textContent = ascii;
}

// Descargar ASCII
function downloadAscii() {
    const ascii = asciiOutput.textContent;
    if (!ascii) return;
    
    const blob = new Blob([ascii], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii_art.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Actualizar imagen en blanco y negro cuando cambia el contraste
contrastInput.addEventListener('input', function() {
    if (originalImage) {
        convertToBlackAndWhite(originalImage);
    }
}); 