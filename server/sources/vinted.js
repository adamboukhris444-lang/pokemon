// Source de prix Vinted via scraping de l'endpoint de recherche interne.
//
// Vinted n'a PAS d'API publique. On passe par un proxy de scraping (Oxylabs,
// fourni avec Hermes Agent sur Hostinger) pour éviter les blocages IP.
//   Renseignez OXYLABS_USERNAME / OXYLABS_PASSWORD dans .env.
// Sans proxy configuré, on tente un appel direct (souvent bloqué hors VPS).
//
// Endpoint interne utilisé : https://www.vinted.fr/api/v2/catalog/items
// (peut évoluer ; à ajuster si Vinted change son schéma).

const VINTED_API = 'https://www.vinted.fr/api/v2/catalog/items'

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function fetchViaOxylabs(targetUrl) {
  const user = process.env.OXYLABS_USERNAME
  const pass = process.env.OXYLABS_PASSWORD
  const basic = Buffer.from(`${user}:${pass}`).toString('base64')

  const res = await fetch('https://realtime.oxylabs.io/v1/queries', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'universal', url: targetUrl, render: false }),
  })
  if (!res.ok) throw new Error(`Oxylabs HTTP ${res.status}: ${await res.text()}`)
  const data = await res.json()
  // Oxylabs renvoie le contenu brut dans results[0].content
  const content = data.results?.[0]?.content
  return typeof content === 'string' ? JSON.parse(content) : content
}

async function fetchDirect(targetUrl) {
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Vinted HTTP ${res.status}`)
  return res.json()
}

export const id = 'vinted'

// Vinted est toujours "activable" : avec Oxylabs c'est fiable, sinon best-effort.
export function isConfigured() {
  return process.env.VINTED_ENABLED === 'true'
}

export async function getPrice(query) {
  const url = `${VINTED_API}?search_text=${encodeURIComponent(query)}&per_page=40&order=newest_first`

  const useProxy = Boolean(process.env.OXYLABS_USERNAME && process.env.OXYLABS_PASSWORD)
  const data = useProxy ? await fetchViaOxylabs(url) : await fetchDirect(url)

  const prices = (data.items || [])
    .map((it) => Number(it.price?.amount ?? it.price))
    .filter((n) => Number.isFinite(n) && n > 0)

  if (prices.length === 0) return null
  return { price: Number(median(prices).toFixed(2)), samples: prices.length }
}
