# BrandKit Studio 🎨

> **BrandKit Studio** es una Progressive Web Application (PWA) offline-first en español para creadores, emprendedores y agencias. Permite almacenar, gestionar, editar y exportar identidades de marca completas (múltiples marcas soportadas), con lienzo gráfico en cliente, eliminación de fondos con IA local y compilador determinista de prompts para IA generativa.

Listo para instalarse como PWA o compilarse a APK nativo en Android mediante Capacitor.

---

## 🚀 Características Principales

1. **Dashboard Multimarca**: Creación y alternancia entre marcas. Resumen visual con misión, visión, tono de voz, logos y enlaces rápidos.
2. **Sistema de Colores y Matriz WCAG 2.1**: Categorización (Primarios, Secundarios, Acento, Neutros, Semánticos), conversión en tiempo real (HEX, RGB, HSL, CMYK) y matriz de contraste completa (AAA / AA / Fallo).
3. **Gestor de Tipografías**: Catálogo Google Fonts en línea y carga de fuentes locales (`.ttf`, `.woff2`) con la API nativa `FontFace` e IndexedDB. Escala editable en vivo (H1, H2, H3, Cuerpo, Botones, Notas).
4. **Bóveda de Logos**: Clasificación por tipos (Principal, Secundario, Isotipo, Monocromo Claro/Oscuro, Favicon), conmutador de fondo, guía de área de seguridad (*clearspace*) y usos incorrectos.
5. **Estudio Creativo (Fabric.js + IA Local)**:
   - Eliminación de fondos 100% en el navegador con `@imgly/background-removal` (WebAssembly / ONNX).
   - Edición por capas, cambio de fondos (sólido, degradado o imagen), textos con tipografías de la marca y plantillas para redes (1:1, 9:16, 4:5, 16:9, etc.).
6. **Prompts IA de Marca (AI Brand Prompt Compiler)**:
   - Motor algorítmico determinista offline que compila prompts hiper-detallados inyectando paleta HEX, fuentes, arquetipos y reglas de marca.
   - Perfiles optimizados para: **ChatGPT + Canva**, **Claude + Canva/SVG**, **Gemini (Imagen 3)**, **Ideogram/Flux/DALL-E 3**, **Midjourney v6+** y **ADN Maestro (System Prompt Universal)**.
   - Bloque de *Negative Prompt*, checklist de verificación visual y enriquecimiento opcional con la API de Google Gemini (Google AI Studio).
7. **Directorio de Redes Sociales**: Mapeo de perfiles, control de estados de usuario, biografías copiables y guía rápida de dimensiones.
8. **Centro de Exportación**:
   - Descarga de **Manual de Marca en PDF** (A4) generado en cliente con `jspdf` y `html2canvas`.
   - Códigos QR personalizados con isotipo y colores de la marca (`qr-code-styling`).
   - Paquete de Favicons e iconos (`16x16`, `32x32`, `192x192`, `512x512`, Apple Touch) en `.zip`.
   - Copia de seguridad completa en formato `.zip` o `.json`.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Vite 5 + React 18 + TypeScript + Tailwind CSS 3
- **Iconos**: Lucide React
- **Almacenamiento Offline**: Dexie.js (IndexedDB) + dexie-react-hooks
- **Canvas y Gráficos**: Fabric.js 7
- **IA en Cliente**: `@imgly/background-removal` (WASM)
- **PWA**: `vite-plugin-pwa` (Service Worker con Workbox y caché offline)
- **Exportaciones**: `jspdf`, `html2canvas`, `jszip`, `qr-code-styling`
- **Móvil (Android)**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción (typecheck + vite build)
npm run build
```

---

## ☁️ Despliegue en Cloudflare Pages

BrandKit Studio es una SPA 100% estática / cliente, perfecta para **Cloudflare Pages**:

1. En el panel de Cloudflare Pages, selecciona **"Connect to Git"** y elige este repositorio.
2. Configuración de compilación (*Build settings*):
   - **Framework preset**: `Vite` (o `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js Version**: `18` o `20` (puedes agregar la variable de entorno `NODE_VERSION = 20`)
3. ¡Despliega! Tendrás tu PWA lista con HTTPS y soporte offline en navegadores de escritorio y celulares.

---

## 📱 Compilación a APK Nativo en Android (Capacitor)

```bash
# 1. Compilar el bundle web
npm run build

# 2. Agregar la plataforma Android (la primera vez)
npx cap add android

# 3. Sincronizar archivos estáticos
npx cap sync android

# 4. Abrir en Android Studio para compilar el APK
npx cap open android
```

---

## 📄 Licencia

MIT
