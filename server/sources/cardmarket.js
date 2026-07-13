// Source de prix Cardmarket via l'API officielle (OAuth1, compte vendeur requis).
//
// Demande d'accès dev : https://www.cardmarket.com/fr/Magic/MainPage/showMainPage
//   Compte > Account > API. Vous recevez :
//     CM_APP_TOKEN, CM_APP_SECRET, CM_ACCESS_TOKEN, CM_ACCESS_SECRET
//
// NOTE : Cardmarket indexe les produits par ID interne, pas par recherche texte
// libre fiable. La résolution nom -> idProduct demande l'endpoint /products/find.
// Cette source est un squelette prêt à compléter une fois les clés obtenues ;
// tant que les clés manquent, isConfigured() renvoie false et elle est ignorée.

export const id = 'cardmarket'

export function isConfigured() {
  return Boolean(
    process.env.CM_APP_TOKEN &&
      process.env.CM_APP_SECRET &&
      process.env.CM_ACCESS_TOKEN &&
      process.env.CM_ACCESS_SECRET
  )
}

// eslint-disable-next-line no-unused-vars
export async function getPrice(query) {
  // À implémenter quand les clés Cardmarket seront disponibles :
  //  1. GET /products/find?search=<query> -> idProduct
  //  2. GET /products/:idProduct -> priceGuide.AVG (cote moyenne)
  // Signature OAuth1 HMAC-SHA1 requise sur chaque requête.
  throw new Error('Source Cardmarket non encore implémentée (clés manquantes).')
}
