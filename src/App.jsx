import { useEffect, useMemo, useState } from 'react'
import ItemsPage from './ItemsPage.jsx'
import AddItemPage from './AddItemPage.jsx'
import ReferentielPage from './ReferentielPage.jsx'
import AuthPage from './AuthPage.jsx'
import BoursePage from './BoursePage.jsx'
import PublierAnnoncePage from './PublierAnnoncePage.jsx'
import CataloguePage from './CataloguePage.jsx'

const TYPE_COLORS = {
  normal: 'var(--color-type-normal)', fire: 'var(--color-type-fire)', water: 'var(--color-type-water)',
  electric: 'var(--color-type-electric)', grass: 'var(--color-type-grass)', ice: 'var(--color-type-ice)',
  fighting: 'var(--color-type-fighting)', poison: 'var(--color-type-poison)', ground: 'var(--color-type-ground)',
  flying: 'var(--color-type-flying)', psychic: 'var(--color-type-psychic)', bug: 'var(--color-type-bug)',
  rock: 'var(--color-type-rock)', ghost: 'var(--color-type-ghost)', dragon: 'var(--color-type-dragon)',
  dark: 'var(--color-type-dark)', steel: 'var(--color-type-steel)', fairy: 'var(--color-type-fairy)',
}

function TypeBadge({ type }) {
  return (
    <span
      className="text-white text-xs px-2.5 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: TYPE_COLORS[type] || '#999' }}
    >
      {type}
    </span>
  )
}

function PokemonCard({ pokemon, onSelect }) {
  return (
    <button
      className="bg-white border-2 border-poke-dark rounded-xl p-3 flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg"
      onClick={() => onSelect(pokemon.id)}
    >
      <span className="self-end text-gray-400 text-xs">#{String(pokemon.id).padStart(3, '0')}</span>
      <img className="w-24 h-24 object-contain" src={pokemon.sprite} alt={pokemon.name_fr || pokemon.name} loading="lazy" />
      <h3 className="my-2 capitalize font-semibold">{pokemon.name_fr || pokemon.name}</h3>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
      </div>
    </button>
  )
}

function PokemonDetailPage({ pokemon, onBack }) {
  const [cards, setCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardsError, setCardsError] = useState(null)
  const [zoomCard, setZoomCard] = useState(null)

  useEffect(() => {
    if (!pokemon) return
    setCards([])
    setCardsError(null)
    setCardsLoading(true)
    fetch(`http://localhost:3001/api/pokemon/${pokemon.id}/cards`)
      .then((r) => {
        if (!r.ok) throw new Error('request failed')
        return r.json()
      })
      .then(setCards)
      .catch(() => setCardsError('Impossible de charger les cartes.'))
      .finally(() => setCardsLoading(false))
  }, [pokemon])

  if (!pokemon) return null
  return (
    <div className="py-4 pb-10">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 rounded-full border-2 border-poke-dark font-semibold bg-white hover:bg-gray-50 cursor-pointer"
      >
        ← Retour
      </button>

      <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
        <span className="self-end text-gray-400 text-xs">#{String(pokemon.id).padStart(3, '0')}</span>
        <img className="w-40 h-40 object-contain" src={pokemon.sprite} alt={pokemon.name_fr || pokemon.name} />
        <h2 className="capitalize my-1 text-xl font-bold">{pokemon.name_fr || pokemon.name}</h2>
        <div className="flex gap-1.5 flex-wrap justify-center">
          {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
        </div>
        <div className="w-full max-w-xs mt-4">
          {pokemon.stats.map((s) => (
            <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
              <span className="w-24 capitalize text-gray-600">{s.name}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-poke-red"
                  style={{ width: `${Math.min(100, (s.value / 150) * 100)}%` }}
                />
              </div>
              <span className="w-7 text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 w-screen relative left-1/2 -translate-x-1/2 px-6">
        <h3 className="text-center font-bold mb-1">🃏 Cartes existantes</h3>
        <p className="text-center text-xs text-gray-400 mb-4">
          Source: TCGdex (noms et images en français — les exclusivités japonaises ne sont généralement pas indexées)
        </p>

        {cardsLoading && <p className="text-center text-sm text-gray-500">Chargement des cartes...</p>}
        {cardsError && <p className="text-center text-sm text-red-700">{cardsError}</p>}
        {!cardsLoading && !cardsError && cards.length === 0 && (
          <p className="text-center text-sm text-gray-400">Aucune carte trouvée pour ce Pokémon.</p>
        )}

        {cards.length > 0 && (
          <>
            <p className="text-center text-xs text-gray-500 mb-4">{cards.length} carte{cards.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-10 gap-4 max-w-7xl mx-auto">
              {cards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setZoomCard(c)}
                  className="flex flex-col items-center w-full cursor-pointer hover:-translate-y-1 transition-transform"
                >
                  <img src={c.image} alt={c.name} className="w-full rounded-lg shadow-lg" />
                  <span className="text-xs text-gray-500 mt-2 text-center">
                    {c.setName} · #{c.number}{c.rarity ? ` · ${c.rarity}` : ''}
                  </span>
                  {c.hasFirstEdition && (
                    <span className="text-[10px] text-poke-dark font-semibold mt-0.5 text-center">
                      Existe en 1re Édition
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {zoomCard && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomCard(null)}
        >
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={zoomCard.imageHigh || zoomCard.image} alt={zoomCard.name} className="max-h-[80vh] rounded-xl shadow-2xl" />
            <p className="text-white mt-3 text-center">
              {zoomCard.setName} · #{zoomCard.number}{zoomCard.rarity ? ` · ${zoomCard.rarity}` : ''}
            </p>
            <button
              onClick={() => setZoomCard(null)}
              className="mt-2 px-4 py-1.5 rounded-full bg-white font-bold text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      className={`px-5 py-2 rounded-full border-2 border-poke-dark font-semibold cursor-pointer transition-colors ${
        active ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function App() {
  const [pokemonList, setPokemonList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [page, setPage] = useState('pokedex')
  const [user, setUser] = useState(() => {
    try { const t = localStorage.getItem('token'); if (!t) return null; const p = JSON.parse(atob(t.split('.')[1])); return p } catch { return null }
  })
  const token = localStorage.getItem('token')

  function handleLogin(u) { setUser(u); setPage('bourse') }

  async function handleLogout() {
    await fetch('http://localhost:3001/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('token')
    setUser(null)
    setPage('pokedex')
  }

  useEffect(() => {
    async function loadPokemon() {
      try {
        const res = await fetch('http://localhost:3001/api/pokemon?limit=1350')
        if (!res.ok) throw new Error('request failed')
        const data = await res.json()
        setPokemonList(data)
      } catch (e) {
        setError("Impossible de charger les Pokémon. Vérifiez votre connexion.")
      } finally {
        setLoading(false)
      }
    }
    loadPokemon()
  }, [])

  useEffect(() => {
    setSelectedDetail(pokemonList.find((p) => p.id === selectedId) || null)
  }, [selectedId, pokemonList])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pokemonList
    return pokemonList.filter((p) =>
      p.name.includes(q) || (p.name_fr && p.name_fr.toLowerCase().includes(q)) || String(p.id) === q
    )
  }, [pokemonList, search])

  return (
    <div className="max-w-5xl mx-auto px-6">
      <nav className="flex justify-center gap-3 pt-4 flex-wrap">
        <NavButton active={page === 'pokedex'} onClick={() => setPage('pokedex')}>
          Pokédex
        </NavButton>
        <NavButton active={page === 'bourse'} onClick={() => setPage('bourse')}>
          🏪 Bourse
        </NavButton>
        <NavButton active={page === 'items'} onClick={() => setPage('items')}>
          Ma Collection
        </NavButton>
        <NavButton active={page === 'add'} onClick={() => setPage('add')}>
          Ajouter un achat
        </NavButton>
        <NavButton active={page === 'catalogue'} onClick={() => setPage('catalogue')}>
          📦 ETB & Displays
        </NavButton>
        <NavButton active={page === 'referentiel'} onClick={() => setPage('referentiel')}>
          Référentiel IA
        </NavButton>
        {user ? (
          <button
            onClick={handleLogout}
            className="px-5 py-2 rounded-full border-2 border-gray-400 font-semibold cursor-pointer bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {user.pseudo || user.email?.split('@')[0]} · Déconnexion
          </button>
        ) : (
          <NavButton active={page === 'auth'} onClick={() => setPage('auth')}>
            🔑 Connexion
          </NavButton>
        )}
      </nav>

      {page === 'pokedex' && selectedDetail && (
        <PokemonDetailPage pokemon={selectedDetail} onBack={() => setSelectedId(null)} />
      )}

      {page === 'pokedex' && !selectedDetail && (
        <>
          <header className="flex flex-col items-center gap-4 py-8">
            <h1 className="text-4xl font-bold drop-shadow-[2px_2px_0_white]">⚡ Pokédex</h1>
            <input
              className="w-full max-w-md px-4 py-3 rounded-full border-2 border-poke-dark outline-none"
              type="text"
              placeholder="Rechercher un Pokémon par nom ou numéro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </header>

          {loading && <p className="text-center text-lg my-8">Chargement des Pokémon...</p>}
          {error && <p className="text-center text-lg my-8 text-red-700">{error}</p>}

          <main className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {filtered.map((p) => (
              <PokemonCard key={p.id} pokemon={p} onSelect={setSelectedId} />
            ))}
          </main>

          {!loading && filtered.length === 0 && (
            <p className="text-center text-lg my-8">Aucun Pokémon trouvé.</p>
          )}
        </>
      )}

      {page === 'items' && <ItemsPage token={token} user={user} onLogin={() => setPage('auth')} />}

      {page === 'add' && <AddItemPage token={token} user={user} onItemAdded={() => setPage('items')} onLogin={() => setPage('auth')} />}

      {page === 'catalogue' && <CataloguePage token={token} user={user} onLogin={() => setPage('auth')} />}

      {page === 'referentiel' && <ReferentielPage />}

      {page === 'auth' && <AuthPage onLogin={handleLogin} />}

      {page === 'bourse' && (
        <BoursePage user={user} onPublish={() => setPage('publier')} />
      )}

      {page === 'publier' && (
        <PublierAnnoncePage
          token={token}
          onPublished={() => setPage('bourse')}
          onBack={() => setPage('bourse')}
        />
      )}
    </div>
  )
}
