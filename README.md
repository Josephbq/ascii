# Conversor de Imagen a ASCII (Web)

Una aplicación web que convierte imágenes en arte ASCII, con la capacidad de previsualizar la imagen en blanco y negro antes de la conversión.

## Características

- 🖼️ **Carga de Imágenes**: Soporta formatos comunes (PNG, JPG, JPEG, BMP, GIF)
- ⚡ **Procesamiento en Tiempo Real**: Conversión instantánea a blanco y negro
- 🎨 **Ajustes Personalizables**:
  - Control de contraste
  - Ajuste del ancho del arte ASCII
- 📱 **Interfaz Responsiva**: Funciona en dispositivos móviles y de escritorio
- 💾 **Descarga de Resultados**: Guarda el arte ASCII en formato texto
- 🖥️ **Vista Previa**: Muestra la imagen original y la versión en blanco y negro

## Cómo Usar

1. **Abrir la Aplicación**
   - Simplemente abre el archivo `index.html` en tu navegador web

2. **Cargar una Imagen**
   - Haz clic en "Seleccionar Imagen"
   - Elige una imagen de tu dispositivo

3. **Ajustar Configuraciones**
   - **Ancho ASCII**: Controla el número de caracteres por línea (20-200)
   - **Contraste**: Ajusta el contraste de la imagen (0.5-2.0)

4. **Generar Arte ASCII**
   - Haz clic en "Convertir a ASCII"
   - El resultado aparecerá en la sección inferior

5. **Descargar Resultado**
   - Haz clic en "Descargar ASCII"
   - El archivo se guardará como `ascii_art.txt`

## Consejos para Mejores Resultados

### Selección de Imagen
- Usa imágenes con buen contraste
- Evita imágenes muy oscuras o muy claras
- Las imágenes con formas definidas funcionan mejor

### Ajustes Recomendados
- **Para fotos**:
  - Ancho ASCII: 100-150
  - Contraste: 1.2-1.5

- **Para logos o texto**:
  - Ancho ASCII: 50-80
  - Contraste: 1.5-2.0

- **Para arte simple**:
  - Ancho ASCII: 30-50
  - Contraste: 1.0-1.2

## Requisitos Técnicos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- No requiere conexión a internet
- No requiere instalación de software adicional

## Estructura del Proyecto

```
conversor-ascii/
├── index.html      # Interfaz de usuario
├── script.js       # Lógica de procesamiento
└── README.md       # Este archivo
```

## Caracteres ASCII Utilizados

El programa utiliza la siguiente secuencia de caracteres, ordenados por densidad:
```
@%#*+=-:. 
```

## Limitaciones

- El tamaño máximo de imagen recomendado es de 2000x2000 píxeles
- El procesamiento se realiza en el navegador, por lo que imágenes muy grandes pueden causar lentitud
- La calidad del resultado depende de la resolución y contraste de la imagen original

## Contribuir

Si deseas contribuir al proyecto:
1. Haz un fork del repositorio
2. Crea una rama para tu característica
3. Envía un pull request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles. 
