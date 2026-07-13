import { useEffect, useState } from 'react'
import { API } from './api.js'

const ETAT_COLORS = {
  'Near Mint': 'text-green-700', 'Excellent': 'text-green-600', 'Bon état': 'text-yellow-600',
  'Joué': 'text-orange-500', 'Abîmé': 'text-red-600',
}

const CAT_BADGE = {
  'Carte': 'bg-blue-100 text-blue-800',
  'ETB': 'bg-yellow-100 text-yellow-800',
  'Display': 'bg-orange-100 text-orange-800',
  'Booster': 'bg-green-100 text-green-800',
  'Coffret': 'bg-purple-100 text-purple-800',
  'Tin': 'bg-gray-100 text-gray-700',
  'Bundle': 'bg-indigo-100 text-indigo-800',
}

function AnnonceCard({ a, onClose, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div className={`bg-white border-2 rounded-xl overflow-hidden flex flex-col transition-colors ${
      a.statut !== 'active' ? 'border-gray-100 opacity-70' : 'border-gray-200 hover:border-poke-dark'
    }`}>
      <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
        {a.image_url ? (
          <img src={a.image_url} alt={a.nom} className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-4xl text-gray-200">{a.categorie === 'Carte' ? '🃏' : '📦'}</span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate text-sm">{a.nom}</p>
            {a.set_extension && (
              <p className="text-xs text-gray-400">{a.set_extension}{a.numero_carte ? ` · #${a.numero_carte}` : ''}</p>
            )}
          </div>
          <p className="text-lg font-bold text-green-700 whitespace-nowrap shrink-0">{Number(a.prix).toFixed(2)} €</p>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {a.categorie && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_BADGE[a.categorie] || 'bg-gray-100 text-gray-600'}`}>
              {a.categorie}
            </span>
          )}
          {a.etat && <span className={`text-xs font-semibold ${ETAT_COLORS[a.etat] || 'text-gray-600'}`}>{a.etat}</span>}
          {a.statut !== 'active' && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Vendu</span>
          )}
        </div>

        {a.description && <p className="text-xs text-gray-500 line-clamp-2">{a.description}</p>}

        <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>Par <strong className="text-gray-600">{a.pseudo || a.email?.split('@')[0]}</strong></span>
          <span>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
        </div>

        {/* Actions "Mes annonces" */}
        {(onClose || onDelete) && (
          <div className="flex gap-2 mt-1">
            {onClose && a.statut === 'active' && (
              <button
                onClick={() => onClose(a.id)}
                className="flex-1 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Marquer vendu ✓
              </button>
            )}
            {onDelete && (
              confirmDel ? (
                <span className="flex gap-1 flex-1">
                  <button onClick={() => onDelete(a.id)} className="flex-1 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Confirmer</button>
                  <button onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded-lg border text-xs text-gray-500 hover:bg-gray-50">Annuler</button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50 cursor-pointer transition-colors"
                >
                  Supprimer
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function BoursePage({ user, token, onPublish }) {
  const [tab, setTab] = useState('marketplace')
  const [annonces, setAnnonces] = useState([])
  const [mesAnnonces, setMesAnnonces] = useState([])
  const [loading, setLoading] = useState(true)
  const [mesLoading, setMesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/annonces`)
      .then((r) => r.json())
      .then(setAnnonces)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'mes' || !user || !token) return
    setMesLoading(true)
    fetch(`${API}/api/annonces/mes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setMesAnnonces)
      .catch(() => {})
      .finally(() => setMesLoading(false))
  }, [tab, user, token])

  async function closeAnnonce(id) {
    await fetch(`${API}/api/annonces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ statut: 'closed' }),
    })
    setMesAnnonces((prev) => prev.map((a) => (a.id === id ? { ...a, statut: 'closed' } : a)))
  }

  async function deleteAnnonce(id) {
    await fetch(`${API}/api/annonces/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setMesAnnonces((prev) => prev.filter((a) => a.id !== id))
  }

  const categories = [...new Set(annonces.map((a) => a.categorie).filter(Boolean))].sort()

  const filtered = annonces.filter((a) => {
    const q = search.toLowerCase()
    return (
      (!q || a.nom.toLowerCase().includes(q) || (a.set_extension || '').toLowerCase().includes(q) || (a.pseudo || '').toLowerCase().includes(q)) &&
      (!catFilter || a.categorie === catFilter)
    )
  })

  return (
    <div className="py-4 pb-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold">Bourse</h1>
        {user && (
          <button
            onClick={onPublish}
            className="px-5 py-2 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300 transition-colors"
          >
            + Publier
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200 pb-3">
        <button
          onClick={() => setTab('marketplace')}
          className={`px-4 py-2 rounded-full border-2 border-poke-dark font-semibold text-sm cursor-pointer transition-colors ${
            tab === 'marketplace' ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
          }`}
        >
          Marketplace
          {annonces.length > 0 && (
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{annonces.length}</span>
          )}
        </button>
        {user && (
          <button
            onClick={() => setTab('mes')}
            className={`px-4 py-2 rounded-full border-2 border-poke-dark font-semibold text-sm cursor-pointer transition-colors ${
              tab === 'mes' ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
            }`}
          >
            Mes annonces
          </button>
        )}
      </div>

      {/* ── Marketplace ── */}
      {tab === 'marketplace' && (
        <>
          <div className="flex gap-3 flex-wrap mb-5">
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article, une extension, un vendeur..."
              className="flex-1 min-w-48 px-4 py-2.5 rounded-full border-2 border-gray-300 focus:border-poke-dark outline-none transition-colors"
            />
            {categories.length > 0 && (
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-4 py-2.5 rounded-full border-2 border-gray-300 focus:border-poke-dark outline-none bg-white text-sm transition-colors"
              >
                <option value="">Toutes catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {loading && <p className="text-center text-gray-400 my-10">Chargement des annonces...</p>}

          {!loading && filtered.length === 0 && (
            <div className="text-center my-16 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p className="font-semibold text-gray-600">
                {search || catFilter ? 'Aucune annonce pour cette recherche' : 'Aucune annonce pour le moment'}
              </p>
              {!search && !catFilter && user && <p className="text-sm mt-1">Soyez le premier à publier !</p>}
              {!search && !catFilter && !user && <p className="text-sm mt-1">Connectez-vous pour publier une annonce.</p>}
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {filtered.map((a) => <AnnonceCard key={a.id} a={a} />)}
          </div>
        </>
      )}

      {/* ── Mes annonces ── */}
      {tab === 'mes' && (
        <>
          {mesLoading && <p className="text-center text-gray-400 my-10">Chargement...</p>}

          {!mesLoading && mesAnnonces.length === 0 && (
            <div className="text-center my-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-semibold text-gray-600">Aucune annonce publiée</p>
              <button
                onClick={onPublish}
                className="mt-5 px-6 py-2.5 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300 transition-colors"
              >
                Publier une annonce
              </button>
            </div>
          )}

          {!mesLoading && mesAnnonces.length > 0 && (
            <>
              <p className="text-sm text-gray-400 mb-4">
                {mesAnnonces.filter((a) => a.statut === 'active').length} active{mesAnnonces.filter((a) => a.statut === 'active').length !== 1 ? 's' : ''} · {mesAnnonces.filter((a) => a.statut !== 'active').length} vendue{mesAnnonces.filter((a) => a.statut !== 'active').length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {mesAnnonces.map((a) => (
                  <AnnonceCard
                    key={a.id}
                    a={a}
                    onClose={closeAnnonce}
                    onDelete={deleteAnnonce}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
