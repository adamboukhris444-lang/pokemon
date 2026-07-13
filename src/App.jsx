import { useEffect, useMemo, useState } from 'react'
import ItemsPage from './ItemsPage.jsx'
import AddItemPage from './AddItemPage.jsx'
import ReferentielPage from './ReferentielPage.jsx'
import AuthPage from './AuthPage.jsx'
import BoursePage from './BoursePage.jsx'
import PublierAnnoncePage from './PublierAnnoncePage.jsx'
import CataloguePage from './CataloguePage.jsx'
import { API } from './api.js'

const TYPE_COLORS = {
  normal: 'var(--color-type-normal)', fire: 'var(--color-type-fire)', water: 'var(--color-type-water)',
  electric: 'var(--color-type-electric)', grass: 'var(--color-type-grass)', ice: 'var(--color-type-ice)',
  fighting: 'var(--color-type-fighting)', poison: 'var(--color-type-poison)', ground: 'var(--color-type-ground)',
  flying: 'var(--color-type-flying)', psychic: 'var(--color-type-psychic)', bug: 'var(--color-type-bug)',
  rock: 'var(--color-type-rock)', ghost: 'var(--color-type-ghost)', dragon: 'var(--color-type-dragon)',
  dark: 'var(--color-type-dark)', steel: 'var(--color-type-steel)', fairy: 'var(--color-type-fairy)',
}

function PokéballIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden fill="none">
      <circle cx="16" cy="16" r="15" fill="white" />
      <path d="M1,16 A15,15 0 0,1 31,16 Z" fill="#e3350d" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#222" strokeWidth="2" />
      <line x1="1" y1="16" x2="31" y2="16" stroke="#222" strokeWidth="2" />
      <circle cx="16" cy="16" r="5" fill="#222" />
      <circle cx="16" cy="16" r="3" fill="white" />
    </svg>
  )
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
      className="bg-white border-2 border-gray-200 rounded-xl p-3 flex flex-col items-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md hover:border-poke-dark group"
      onClick={() => onSelect(pokemon.id)}
    >
      <span className="self-end text-gray-400 text-xs">#{String(pokemon.id).padStart(3, '0')}</span>
      <img className="w-24 h-24 object-contain group-hover:scale-105 transition-transform" src={pokemon.sprite} alt={pokemon.name_fr || pokemon.name} />
      <h3 className="my-2 capitalize font-semibold text-sm text-center">{pokemon.name_fr || pokemon.name}</h3>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
      </div>
    </button>
  )
}

function PokémonSkeleton() {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 animate-pulse">
      <div className="w-6 h-3 bg-gray-200 rounded self-end" />
      <div className="w-24 h-24 bg-gray-200 rounded-full" />
      <div className="w-20 h-4 bg-gray-200 rounded mt-1" />
      <div className="flex gap-1"><div className="w-12 h-4 bg-gray-200 rounded-full" /><div className="w-12 h-4 bg-gray-200 rounded-full" /></div>
    </div>
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
    fetch(`${API}/api/pokemon/${pokemon.id}/cards`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setCards)
      .catch(() => setCardsError('Impossible de charger les cartes.'))
      .finally(() => setCardsLoading(false))
  }, [pokemon])

  if (!pokemon) return null

  return (
    <div className="py-4 pb-10">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 rounded-full border-2 border-poke-dark font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-colors"
      >
        ← Retour
      </button>

      <div className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-sm border border-gray-100">
        <span className="self-end text-gray-400 text-xs">#{String(pokemon.id).padStart(3, '0')}</span>
        <img className="w-40 h-40 object-contain" src={pokemon.sprite} alt={pokemon.name_fr || pokemon.name} />
        <h2 className="capitalize my-1 text-2xl font-bold">{pokemon.name_fr || pokemon.name}</h2>
        <div className="flex gap-1.5 flex-wrap justify-center mb-4">
          {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
        </div>
        <div className="w-full max-w-xs">
          {pokemon.stats.map((s) => (
            <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
              <span className="w-28 capitalize text-gray-500">{s.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-poke-red rounded-full" style={{ width: `${Math.min(100, (s.value / 150) * 100)}%` }} />
              </div>
              <span className="w-8 text-right font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 w-screen relative left-1/2 -translate-x-1/2 px-6">
        <h3 className="text-center text-xl font-bold mb-1">Cartes existantes</h3>
        <p className="text-center text-xs text-gray-400 mb-5">
          Source : TCGdex (fr) · Les exclusivités japonaises peuvent ne pas être indexées
        </p>

        {cardsLoading && (
          <div className="grid grid-cols-10 gap-4 max-w-7xl mx-auto animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="bg-gray-200 rounded-lg aspect-[2/3]" />)}
          </div>
        )}
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
                  <img src={c.image} alt={c.name} className="w-full rounded-lg shadow" />
                  <span className="text-xs text-gray-500 mt-2 text-center leading-tight">
                    {c.setName} · #{c.number}
                  </span>
                  {c.hasFirstEdition && (
                    <span className="text-[10px] text-poke-dark font-semibold mt-0.5">1re Éd.</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {zoomCard && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomCard(null)}
        >
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={zoomCard.imageHigh || zoomCard.image} alt={zoomCard.name} className="max-h-[80vh] rounded-xl shadow-2xl" />
            <p className="text-white mt-3 text-center text-sm">
              {zoomCard.setName} · #{zoomCard.number}
            </p>
            <button onClick={() => setZoomCard(null)} className="mt-2 px-5 py-2 rounded-full bg-white font-bold text-sm hover:bg-gray-100">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const NAV = [
  { id: 'pokedex', label: 'Pokédex' },
  { id: 'bourse', label: 'Bourse' },
  { id: 'items', label: 'Ma Collection' },
  { id: 'add', label: 'Ajouter' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'referentiel', label: 'Référentiel IA' },
]

export default function App() {
  const [pokemonList, setPokemonList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [displayCount, setDisplayCount] = useState(60)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [page, setPage] = useState('pokedex')
  const [user, setUser] = useState(() => {
    try {
      const t = localStorage.getItem('token')
      if (!t) return null
      return JSON.parse(atob(t.split('.')[1]))
    } catch { return null }
  })
  const token = localStorage.getItem('token')

  function navigate(id) {
    setPage(id)
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleLogin(u) { setUser(u); navigate('bourse') }

  async function handleLogout() {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    localStorage.removeItem('token')
    setUser(null)
    navigate('pokedex')
  }

  useEffect(() => {
    fetch(`${API}/api/pokemon?limit=1350`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setPokemonList)
      .catch(() => setError('Impossible de charger les Pokémon. Vérifiez que le serveur est démarré.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSelectedDetail(pokemonList.find((p) => p.id === selectedId) || null)
  }, [selectedId, pokemonList])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pokemonList
    return pokemonList.filter(
      (p) => p.name.includes(q) || (p.name_fr && p.name_fr.toLowerCase().includes(q)) || String(p.id) === q
    )
  }, [pokemonList, search])

  useEffect(() => setDisplayCount(60), [search])

  const visiblePokemon = filtered.slice(0, displayCount)

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-poke-dark shadow-xl">
        <div className="max-w-7xl mx-auto px-3 h-14 flex items-center gap-2">
          {/* Logo */}
          <button
            className="flex items-center gap-2 shrink-0 mr-2 cursor-pointer"
            onClick={() => navigate('pokedex')}
            title="PokéTracker"
          >
            <PokéballIcon size={26} />
            <span className="font-bold text-white text-base tracking-tight hidden sm:block">PokéTracker</span>
          </button>

          {/* Nav */}
          <nav className="flex gap-0.5 overflow-x-auto flex-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate(n.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  page === n.id
                    ? 'bg-poke-yellow text-poke-dark'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="shrink-0 ml-1">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm hidden md:block truncate max-w-28">
                  {user.pseudo || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors whitespace-nowrap"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('auth')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  page === 'auth' ? 'bg-poke-yellow text-poke-dark' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Pokédex */}
        {page === 'pokedex' && selectedDetail && (
          <PokemonDetailPage pokemon={selectedDetail} onBack={() => setSelectedId(null)} />
        )}

        {page === 'pokedex' && !selectedDetail && (
          <>
            <div className="flex flex-col items-center gap-4 py-8">
              <h1 className="text-4xl font-bold">⚡ Pokédex</h1>
              <input
                className="w-full max-w-md px-4 py-3 rounded-full border-2 border-gray-300 bg-white outline-none shadow-sm focus:border-poke-dark transition-colors"
                type="text"
                placeholder="Rechercher par nom ou numéro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-4">
                {Array.from({ length: 12 }).map((_, i) => <PokémonSkeleton key={i} />)}
              </div>
            )}
            {error && <p className="text-center text-lg my-8 text-red-700">{error}</p>}

            {!loading && !error && (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-4">
                  {visiblePokemon.map((p) => (
                    <PokemonCard key={p.id} pokemon={p} onSelect={setSelectedId} />
                  ))}
                </div>

                {filtered.length > displayCount && (
                  <div className="text-center my-8">
                    <button
                      onClick={() => setDisplayCount((c) => c + 60)}
                      className="px-8 py-3 rounded-full border-2 border-poke-dark bg-white font-bold hover:bg-poke-yellow transition-colors cursor-pointer shadow-sm"
                    >
                      Voir {Math.min(60, filtered.length - displayCount)} de plus
                      <span className="ml-2 text-gray-400 font-normal text-sm">({displayCount} / {filtered.length})</span>
                    </button>
                  </div>
                )}

                {filtered.length === 0 && (
                  <div className="text-center my-12 text-gray-400">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="font-semibold text-gray-600">Aucun Pokémon trouvé pour « {search} »</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {page === 'items' && <ItemsPage token={token} user={user} onLogin={() => navigate('auth')} />}
        {page === 'add' && <AddItemPage token={token} user={user} onItemAdded={() => navigate('items')} onLogin={() => navigate('auth')} />}
        {page === 'catalogue' && <CataloguePage token={token} user={user} onLogin={() => navigate('auth')} />}
        {page === 'referentiel' && <ReferentielPage />}
        {page === 'auth' && <AuthPage onLogin={handleLogin} />}
        {page === 'bourse' && <BoursePage user={user} token={token} onPublish={() => navigate('publier')} />}
        {page === 'publier' && (
          <PublierAnnoncePage token={token} onPublished={() => navigate('bourse')} onBack={() => navigate('bourse')} />
        )}
      </main>
    </div>
  )
}
