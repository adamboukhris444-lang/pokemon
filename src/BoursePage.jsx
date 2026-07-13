import { useEffect, useState } from 'react'

const ETAT_COLORS = {
  'Near Mint': 'text-green-700', 'Excellent': 'text-green-600', 'Bon état': 'text-yellow-600',
  'Joué': 'text-orange-500', 'Abîmé': 'text-red-600',
}

export default function BoursePage({ user, onPublish }) {
  const [annonces, setAnnonces] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadAnnonces() }, [])

  async function loadAnnonces() {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/annonces')
      setAnnonces(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  const filtered = annonces.filter((a) => {
    const q = search.toLowerCase()
    return !q || a.nom.toLowerCase().includes(q) || (a.set_extension || '').toLowerCase().includes(q) || (a.pseudo || '').toLowerCase().includes(q)
  })

  return (
    <div className="py-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">🏪 Bourse</h1>
        {user && (
          <button
            onClick={onPublish}
            className="px-5 py-2 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300 transition-colors"
          >
            + Publier une annonce
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un Pokémon, une extension, un vendeur..."
        className="w-full px-4 py-3 rounded-full border-2 border-gray-300 focus:border-poke-dark outline-none mb-6"
      />

      {loading && <p className="text-center text-gray-500 my-8">Chargement des annonces...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center my-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold text-gray-600">Aucune annonce{search ? ' pour cette recherche' : ' pour le moment'}</p>
          {!search && user && <p className="text-sm mt-1">Soyez le premier à publier !</p>}
          {!user && <p className="text-sm mt-1">Connectez-vous pour publier une annonce.</p>}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {filtered.map((a) => (
          <div key={a.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-2 hover:border-poke-dark transition-colors">
            {a.image_url && (
              <img src={a.image_url} alt={a.nom} className="w-full h-40 object-contain rounded-lg" loading="lazy" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{a.nom}</p>
                {a.set_extension && <p className="text-xs text-gray-500">{a.set_extension}{a.numero_carte ? ` · #${a.numero_carte}` : ''}</p>}
              </div>
              <p className="text-xl font-bold text-green-700 whitespace-nowrap">{Number(a.prix).toFixed(2)} €</p>
            </div>
            {a.etat && (
              <span className={`text-xs font-semibold ${ETAT_COLORS[a.etat] || 'text-gray-600'}`}>
                État : {a.etat}
              </span>
            )}
            {a.description && <p className="text-sm text-gray-600 line-clamp-2">{a.description}</p>}
            <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
              <span>Par <strong className="text-gray-600">{a.pseudo || a.email?.split('@')[0]}</strong></span>
              <span>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
