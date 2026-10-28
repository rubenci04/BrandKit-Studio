/** Enriquecimiento OPCIONAL con la API de Gemini (clave gratuita de Google AI Studio). Requiere conexión. */
const KEY_STORE = 'bk-gemini-key'
const MODEL_STORE = 'bk-gemini-model'

export const getGeminiKey = () => localStorage.getItem(KEY_STORE) ?? ''
export const setGeminiKey = (k: string) => (k ? localStorage.setItem(KEY_STORE, k) : localStorage.removeItem(KEY_STORE))
export const getGeminiModel = () => localStorage.getItem(MODEL_STORE) || 'gemini-flash-latest'
export const setGeminiModel = (m: string) => localStorage.setItem(MODEL_STORE, m)

export async function enrichWithGemini(prompt: string, negative: string, lang: 'es' | 'en'): Promise<string> {
  const key = getGeminiKey()
  if (!key) throw new Error('Ingresa tu clave de Google AI Studio')
  const instruction =
    (lang === 'es'
      ? 'Eres un experto en prompt engineering para diseño gráfico con IA. Mejora el siguiente prompt: hazlo más específico, evocador y preciso, sin cambiar NINGÚN código HEX, nombre de fuente, texto entre comillas ni regla de marca. Mantén la estructura por secciones. Devuelve solo el prompt mejorado, en español.'
      : 'You are an expert in prompt engineering for AI graphic design. Improve the following prompt: make it more specific, vivid and precise, without changing ANY HEX code, font name, quoted text or brand rule. Keep the section structure. Return only the improved prompt, in English.') +
    `\n\n--- PROMPT ---\n${prompt}\n\n--- NEGATIVE ---\n${negative}`
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error?.message ?? `Error ${res.status} de la API de Gemini`)
  }
  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
  if (!text) throw new Error('Gemini no devolvió texto')
  return text.trim()
}
