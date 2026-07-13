// Source de prix eBay via la Browse API officielle.
//
// Auth : OAuth2 "client credentials" (App token), gratuit.
//   1. Créez une app sur https://developer.ebay.com (production keyset)
//   2. Récupérez App ID (Client ID) + Cert ID (Client Secret)
//   3. Renseignez EBAY_CLIENT_ID / EBAY_CLIENT_SECRET dans .env
//
// La Browse API renvoie des ANNONCES ACTIVES (pas les ventes conclues).
// On calcule la médiane des prix pour limiter l'effet des annonces extrêmes.

const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token'
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const MARKETPLACE = process.env.EBAY_MARKETPLACE || 'EBAY_FR'

let cachedToken = null
let tokenExpiry = 0

async function getAppToken() {
  const id = process.env.EBAY_CLIENT_ID
  const secret = process.env.EBAY_CLIENT_SECRET
  if (!id || !secret) throw new Error('EBAY_CLIENT_ID / EBAY_CLIENT_SECRET manquants')

  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken

  const basic = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  })
  if (!res.ok) throw new Error(`eBay token HTTP ${res.status}: ${await res.text()}`)

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000
  return cachedToken
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export const id = 'ebay'

export function isConfigured() {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET)
}

// Renvoie { price, samples } ou null si rien trouvé.
export async function getPrice(query) {
  const token = await getAppToken()
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&limit=50&filter=buyingOptions:{FIXED_PRICE}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
    },
  })
  if (!res.ok) throw new Error(`eBay search HTTP ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const prices = (data.itemSummaries || [])
    .map((it) => Number(it.price?.value))
    .filter((n) => Number.isFinite(n) && n > 0)

  if (prices.length === 0) return null
  return { price: Number(median(prices).toFixed(2)), samples: prices.length }
}
