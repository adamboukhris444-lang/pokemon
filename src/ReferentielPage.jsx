import { useEffect, useState } from 'react'
import { API } from './api.js'

const QUERIES = [
  'Catalogue complet Pokemon TCG France 2025 avec EAN',
  'ETB Display Coffret Pokemon Étincelles Déferlantes EV08 EAN',
  'Boosters Tin Bundle Pokemon Couronne Stellaire Fable Nébuleuse EAN',
  'Pokemon TCG Forces Temporelles Mascarade Crépusculaire EAN référence',
]

export default function ReferentielPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [query, setQuery] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { loadReferentiel() }, [])

  async function loadReferentiel() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/referentiel`)
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      setError('Impossible de charger le référentiel.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnrich(e) {
    e.preventDefault()
    setEnriching(true)
    setLastResult(null)
    setError(null)
    try {
      const q = query.trim() || 'produits Pokemon TCG disponibles en France 2024 2025'
      const res = await fetch(`${API}/api/referentiel/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setLastResult(data)
      await loadReferentiel()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnriching(false)
    }
  }

  const byCategorie = items.reduce((acc, item) => {
    const cat = item.categorie || 'Autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="py-4 pb-10">
      <h1 className="text-center text-3xl font-bold mb-1">🤖 Référentiel IA</h1>
      <p className="text-center text-gray-500 mb-6 text-sm">
        Agent Hermes · {items.length} produit{items.length !== 1 ? 's' : ''} indexé{items.length !== 1 ? 's' : ''}
      </p>

      <form onSubmit={handleEnrich} className="flex gap-2 mb-3 max-w-2xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex: coffrets Pokemon France 2025..."
          className="flex-1 px-4 py-2.5 rounded-full border-2 border-gray-300 focus:border-poke-dark outline-none"
          disabled={enriching}
        />
        <button
          type="submit"
          disabled={enriching}
          className="px-5 py-2.5 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold disabled:opacity-60 cursor-pointer hover:bg-yellow-300 transition-colors whitespace-nowrap"
        >
          {enriching ? '🔍 Recherche...' : '🤖 Enrichir'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            disabled={enriching}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:border-poke-dark bg-white text-gray-600 cursor-pointer disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {enriching && (
        <div className="text-center py-10 bg-white rounded-2xl border-2 border-poke-dark max-w-lg mx-auto mb-6">
          <p className="text-xl font-bold mb-1">🤖 Hermes Agent en action...</p>
          <p className="text-gray-500 text-sm">L'agent recherche sur internet et alimente le référentiel</p>
          <p className="text-gray-400 text-xs mt-2">Cela peut prendre 1 à 3 minutes</p>
        </div>
      )}

      {lastResult && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
          <p className="font-bold text-green-800">
            ✅ {lastResult.added.length} nouveau{lastResult.added.length !== 1 ? 'x' : ''} produit{lastResult.added.length !== 1 ? 's' : ''} ajouté{lastResult.added.length !== 1 ? 's' : ''}
            {lastResult.skipped.length > 0 && ` · ${lastResult.skipped.length} déjà présent${lastResult.skipped.length !== 1 ? 's' : ''}`}
          </p>
          {lastResult.added.length > 0 && (
            <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
              {lastResult.added.slice(0, 5).map((i) => <li key={i.id}>{i.nom}</li>)}
              {lastResult.added.length > 5 && <li>et {lastResult.added.length - 5} autres...</li>}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-center text-red-700 mb-4 font-semibold">{error}</p>}

      {loading && <p className="text-center text-lg my-8">Chargement du référentiel...</p>}

      {!loading && items.length === 0 && !enriching && (
        <div className="text-center my-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-lg font-semibold text-gray-600">Référentiel vide</p>
          <p className="text-sm mt-1">Cliquez sur "Enrichir" pour lancer l'agent Hermes</p>
        </div>
      )}

      {!loading && Object.entries(byCategorie).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-base font-bold mb-2 px-1 text-gray-700">
            {cat}
            <span className="ml-2 text-gray-400 font-normal text-sm">({catItems.length})</span>
          </h2>
          <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left bg-poke-dark text-white">Nom</th>
                <th className="px-4 py-2 text-left bg-poke-dark text-white">Référence</th>
                <th className="px-4 py-2 text-left bg-poke-dark text-white">Ajouté le</th>
              </tr>
            </thead>
            <tbody>
              {catItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 border-b border-gray-100">{item.nom}</td>
                  <td className="px-4 py-2 border-b border-gray-100 font-mono text-xs text-gray-500">{item.reference || '—'}</td>
                  <td className="px-4 py-2 border-b border-gray-100 text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
