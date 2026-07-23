import { useEffect, useState } from 'react'
import { API } from './api.js'

// Mapping ETB nom → { logo TCGdex, nom de série }
const ETB_LOGO_MAP = {
  'ETB — Écarlate et Violet':                     { logo: 'https://assets.tcgdex.net/fr/sv/sv01/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Évolutions à Paldea':                    { logo: 'https://assets.tcgdex.net/fr/sv/sv02/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Flammes Obsidiennes':                    { logo: 'https://assets.tcgdex.net/fr/sv/sv03/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — 151':                                     { logo: 'https://assets.tcgdex.net/fr/sv/sv03.5/logo.webp',  serie: 'Écarlate et Violet' },
  'ETB — Faille Paradoxe':                        { logo: 'https://assets.tcgdex.net/fr/sv/sv04/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Destinées de Paldea':                    { logo: 'https://assets.tcgdex.net/fr/sv/sv04.5/logo.webp',  serie: 'Écarlate et Violet' },
  'ETB — Forces Temporelles':                     { logo: 'https://assets.tcgdex.net/fr/sv/sv05/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Mascarade Crépusculaire':                { logo: 'https://assets.tcgdex.net/fr/sv/sv06/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Couronne Stellaire':                     { logo: 'https://assets.tcgdex.net/fr/sv/sv07/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Étincelles Déferlantes':                 { logo: 'https://assets.tcgdex.net/fr/sv/sv08/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Évolutions Prismatiques':                { logo: 'https://assets.tcgdex.net/fr/sv/sv08.5/logo.webp',  serie: 'Écarlate et Violet' },
  'ETB — Aventures Ensemble':                     { logo: 'https://assets.tcgdex.net/fr/sv/sv09/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Rivalités Destinées':                    { logo: 'https://assets.tcgdex.net/fr/sv/sv10/logo.webp',     serie: 'Écarlate et Violet' },
  'ETB — Flamme Blanche':                         { logo: 'https://assets.tcgdex.net/fr/sv/sv10.5w/logo.webp', serie: 'Écarlate et Violet' },
  'ETB — Foudre Noire':                           { logo: 'https://assets.tcgdex.net/fr/sv/sv10.5b/logo.webp', serie: 'Écarlate et Violet' },
  'ETB — Épée et Bouclier':                       { logo: 'https://assets.tcgdex.net/fr/swsh/swsh1/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Clash des Rebelles':                     { logo: 'https://assets.tcgdex.net/fr/swsh/swsh2/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Ténèbres Embrasées':                     { logo: 'https://assets.tcgdex.net/fr/swsh/swsh3/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Voltage Éclatant':                       { logo: 'https://assets.tcgdex.net/fr/swsh/swsh4/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Destinées Radieuses Coffre Étincelant':  { logo: 'https://assets.tcgdex.net/fr/swsh/swsh4.5/logo.webp',  serie: 'Épée et Bouclier' },
  'ETB — Styles de combat':                       { logo: 'https://assets.tcgdex.net/fr/swsh/swsh5/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Règne de Glace':                         { logo: 'https://assets.tcgdex.net/fr/swsh/swsh6/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Évolution Céleste':                      { logo: 'https://assets.tcgdex.net/fr/swsh/swsh7/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Poing de Fusion':                        { logo: 'https://assets.tcgdex.net/fr/swsh/swsh8/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Stars Étincelantes':                     { logo: 'https://assets.tcgdex.net/fr/swsh/swsh9/logo.webp',    serie: 'Épée et Bouclier' },
  'ETB — Astres Radieux':                         { logo: 'https://assets.tcgdex.net/fr/swsh/swsh10/logo.webp',   serie: 'Épée et Bouclier' },
  'ETB — Origine Perdue':                         { logo: 'https://assets.tcgdex.net/fr/swsh/swsh11/logo.webp',   serie: 'Épée et Bouclier' },
  'ETB — Tempête Argentée':                       { logo: 'https://assets.tcgdex.net/fr/swsh/swsh12/logo.webp',   serie: 'Épée et Bouclier' },
  'ETB — Zénith Suprême':                         { logo: 'https://assets.tcgdex.net/fr/swsh/swsh12.5/logo.webp', serie: 'Épée et Bouclier' },
  'ETB — Duo de Choc':                            { logo: 'https://assets.tcgdex.net/fr/sm/sm9/logo.webp',        serie: 'Soleil et Lune' },
  'ETB — Alliance Infaillible':                   { logo: 'https://assets.tcgdex.net/fr/sm/sm10/logo.webp',       serie: 'Soleil et Lune' },
  'ETB — Harmonie des Esprits':                   { logo: 'https://assets.tcgdex.net/fr/sm/sm11/logo.webp',       serie: 'Soleil et Lune' },
  'ETB — Éclipse Cosmique':                       { logo: 'https://assets.tcgdex.net/fr/sm/sm12/logo.webp',       serie: 'Soleil et Lune' },
  'ETB — Destinées Occultes':                     { logo: 'https://assets.tcgdex.net/fr/sm/sm115/logo.webp',      serie: 'Soleil et Lune' },
  'ETB — Légendes Brillantes':                    { logo: 'https://assets.tcgdex.net/fr/sm/sm3.5/logo.webp',      serie: 'Soleil et Lune' },
  'ETB — Lumière Interdite':                      { logo: 'https://assets.tcgdex.net/fr/sm/sm6/logo.webp',        serie: 'Soleil et Lune' },
  'ETB — Tempête Céleste':                        { logo: 'https://assets.tcgdex.net/fr/sm/sm7/logo.webp',        serie: 'Soleil et Lune' },
  'ETB — Tonnerre Perdu':                         { logo: 'https://assets.tcgdex.net/fr/sm/sm8/logo.webp',        serie: 'Soleil et Lune' },
  'ETB — Ultra-Prisme':                           { logo: 'https://assets.tcgdex.net/fr/sm/sm5/logo.webp',        serie: 'Soleil et Lune' },
  'ETB — Méga-Évolution':                         { logo: 'https://assets.tcgdex.net/fr/me/me01/logo.webp',       serie: 'Méga-Évolution' },
  'ETB — Héros Transcendants':                    { logo: 'https://assets.tcgdex.net/fr/xy/xy11/logo.webp',       serie: 'XY' },
  'ETB — Équilibre Parfait':                      { logo: 'https://assets.tcgdex.net/fr/xy/xy10/logo.webp',       serie: 'XY' },
  'ETB — Flammes Fantasmagoriques':               { logo: 'https://assets.tcgdex.net/fr/xy/xy9/logo.webp',        serie: 'XY' },
  'ETB — Chaos Ascendant':                        { logo: 'https://assets.tcgdex.net/fr/xy/xy12/logo.webp',       serie: 'XY' },
}

// Couleurs de fond par série
const SERIE_BG = {
  'Écarlate et Violet': 'bg-red-50',
  'Épée et Bouclier':   'bg-blue-50',
  'Soleil et Lune':     'bg-yellow-50',
  'Méga-Évolution':     'bg-purple-50',
  'XY':                 'bg-green-50',
}

function ProductCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const [imgError2, setImgError2] = useState(false)
  const mapped = ETB_LOGO_MAP[item.nom]

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-poke-dark transition-colors flex flex-col">
      <div className={`h-52 flex items-center justify-center overflow-hidden ${mapped && !item.image_url ? (SERIE_BG[mapped.serie] || 'bg-gray-50') : 'bg-gray-50'}`}>
        {(item.image_url || item.logo_url) && !imgError ? (
          <img
            src={imgError2 || !item.image_url ? item.logo_url : item.image_url}
            alt={item.nom}
            className={`h-full w-full ${item.image_url && !imgError2 ? 'object-contain p-2' : 'object-contain p-4 opacity-80'}`}
            loading="lazy"
            onError={() => {
              if (item.image_url && !imgError2) setImgError2(true)
              else setImgError(true)
            }}
          />
        ) : mapped ? (
          <div className="flex flex-col items-center justify-center gap-2 px-3 w-full">
            <img
              src={mapped.logo}
              alt={mapped.serie}
              className="max-h-20 max-w-full object-contain"
            />
            <span className="text-xs font-semibold text-gray-500 text-center">{mapped.serie}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-300">
            <span className="text-5xl">{item.categorie === 'ETB' ? '🎁' : '📦'}</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        {item.annee && <span className="text-xs text-gray-400 font-semibold">{item.annee}</span>}
        <p className="font-bold text-sm leading-snug">
          {item.nom.replace(/^(ETB — |Display — )/, '')}
        </p>
      </div>
    </div>
  )
}

function TabPanel({ categorie }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [findingImages, setFindingImages] = useState(false)
  const [imgMsg, setImgMsg] = useState(null)

  useEffect(() => {
    setItems([])
    setLoading(true)
    setSearch('')
    setImgMsg(null)
    fetch(`${API}/api/catalogue?categorie=${categorie}`)
      .then(r => r.json())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [categorie])

  async function handleFindImages() {
    setFindingImages(true)
    setImgMsg(null)
    try {
      const res = await fetch(`${API}/api/catalogue/find-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur.')
      setImgMsg(`✅ ${data.updated ?? 0} image(s) mise(s) à jour.`)
      const r2 = await fetch(`${API}/api/catalogue?categorie=${categorie}`)
      setItems(await r2.json())
    } catch (err) {
      setImgMsg(`❌ ${err.message}`)
    } finally {
      setFindingImages(false)
    }
  }

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase()
    return !q || i.nom.toLowerCase().includes(q)
  })

  const withImg = items.filter(i => i.image_url).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Rechercher un ${categorie}...`}
          className="flex-1 px-4 py-2.5 rounded-full border-2 border-gray-300 focus:border-poke-dark outline-none text-sm"
        />
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={handleFindImages}
            disabled={findingImages}
            className="px-4 py-2 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold text-sm cursor-pointer disabled:opacity-60 hover:bg-yellow-300 transition-colors whitespace-nowrap"
          >
            {findingImages ? '⏳ Recherche images...' : '🖼️ Trouver images officielles'}
          </button>
          {items.length > 0 && (
            <span className="text-xs text-gray-400">{withImg}/{items.length} avec image</span>
          )}
        </div>
      </div>

      {imgMsg && <p className="text-center text-sm font-semibold mb-4">{imgMsg}</p>}

      {loading && <p className="text-center text-gray-500 my-10">Chargement...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center my-12 text-gray-400">
          <p className="text-4xl mb-3">{categorie === 'ETB' ? '🎁' : '📦'}</p>
          <p className="font-semibold text-gray-600">
            {search ? 'Aucun résultat' : `Aucun ${categorie} trouvé`}
          </p>
          {!search && (
            <p className="text-sm mt-1">Exécutez <code className="bg-gray-100 px-1 rounded">node server/seed-catalogue.js</code> pour peupler le catalogue.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {filtered.map(item => <ProductCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}

export default function CataloguePage() {
  const [tab, setTab] = useState('ETB')

  return (
    <div className="py-4 pb-10">
      <h1 className="text-center text-3xl font-bold mb-1">
        {tab === 'ETB' ? '🎁' : '📦'} {tab === 'ETB' ? 'Elite Trainer Box' : 'Displays'}
      </h1>
      <p className="text-center text-sm text-gray-400 mb-6">
        Catalogue complet depuis 1999 · du plus récent au plus ancien
      </p>

      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={() => setTab('ETB')}
          className={`px-6 py-2.5 rounded-full border-2 border-poke-dark font-bold text-sm cursor-pointer transition-colors ${
            tab === 'ETB' ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
          }`}
        >
          🎁 ETB
        </button>
        <button
          onClick={() => setTab('Display')}
          className={`px-6 py-2.5 rounded-full border-2 border-poke-dark font-bold text-sm cursor-pointer transition-colors ${
            tab === 'Display' ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
          }`}
        >
          📦 Display
        </button>
      </div>

      <TabPanel key={tab} categorie={tab} />
    </div>
  )
}
