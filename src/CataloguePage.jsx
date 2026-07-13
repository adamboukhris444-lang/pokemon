import { useEffect, useState } from 'react'

const API = 'http://localhost:3001'

function ProductCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const [imgError2, setImgError2] = useState(false)

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-poke-dark transition-colors flex flex-col">
      <div className="bg-gray-50 h-52 flex items-center justify-center overflow-hidden">
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
