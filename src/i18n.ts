import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const es = {
  app: { name: 'BrandKit Studio', tagline: 'Tu identidad de marca, siempre contigo' },
  nav: {
    dashboard: 'Panel', colors: 'Colores', typography: 'Tipografías', logos: 'Logos',
    studio: 'Estudio', prompts: 'Prompts IA', social: 'Redes', export: 'Exportar',
  },
  common: {
    save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', add: 'Añadir', copy: 'Copiar',
    copied: 'Copiado al portapapeles', download: 'Descargar', upload: 'Subir', close: 'Cerrar', confirmDelete: '¿Seguro que deseas eliminar esto?',
    empty: 'Aún no hay elementos', saved: 'Guardado', error: 'Ocurrió un error', processing: 'Procesando…',
  },
}

i18n.use(initReactI18next).init({
  resources: { es: { translation: es } },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
