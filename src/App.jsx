import { useEffect, useMemo, useState } from 'react'

const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
}

function PokemonCard({ pokemon, onSelect }) {
  return (
    <button className="card" onClick={() => onSelect(pokemon.id)}>
      <span className="card-id">#{String(pokemon.id).padStart(3, '0')}</span>
      <img src={pokemon.sprite} alt={pokemon.name} loading="lazy" />
      <h3>{pokemon.name}</h3>
      <div className="types">
        {pokemon.types.map((t) => (
          <span key={t} className="type-badge" style={{ backgroundColor: TYPE_COLORS[t] || '#999' }}>
            {t}
          </span>
        ))}
      </div>
    </button>
  )
}

function Modal({ pokemon, onClose }) {
  if (!pokemon) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <span className="card-id">#{String(pokemon.id).padStart(3, '0')}</span>
        <img src={pokemon.sprite} alt={pokemon.name} />
        <h2>{pokemon.name}</h2>
        <div className="types">
          {pokemon.types.map((t) => (
            <span key={t} className="type-badge" style={{ backgroundColor: TYPE_COLORS[t] || '#999' }}>
              {t}
            </span>
          ))}
        </div>
        <div className="stats">
          {pokemon.stats.map((s) => (
            <div key={s.name} className="stat-row">
              <span className="stat-name">{s.name}</span>
              <div className="stat-bar">
                <div className="stat-fill" style={{ width: `${Math.min(100, (s.value / 150) * 100)}%` }} />
              </div>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [pokemonList, setPokemonList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)

  useEffect(() => {
    async function loadPokemon() {
      try {
        const listRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=60')
        const listData = await listRes.json()
        const details = await Promise.all(
          listData.results.map((p) => fetch(p.url).then((r) => r.json()))
        )
        setPokemonList(
          details.map((d) => ({
            id: d.id,
            name: d.name,
            sprite: d.sprites.other['official-artwork'].front_default || d.sprites.front_default,
            types: d.types.map((t) => t.type.name),
            stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
          }))
        )
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
    return pokemonList.filter((p) => p.name.includes(q) || String(p.id) === q)
  }, [pokemonList, search])

  return (
    <div className="app">
      <header className="header">
        <h1>⚡ Pokédex</h1>
        <input
          className="search"
          type="text"
          placeholder="Rechercher un Pokémon par nom ou numéro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {loading && <p className="status">Chargement des Pokémon...</p>}
      {error && <p className="status error">{error}</p>}

      <main className="grid">
        {filtered.map((p) => (
          <PokemonCard key={p.id} pokemon={p} onSelect={setSelectedId} />
        ))}
      </main>

      {!loading && filtered.length === 0 && (
        <p className="status">Aucun Pokémon trouvé.</p>
      )}

      <Modal pokemon={selectedDetail} onClose={() => setSelectedId(null)} />
    </div>
  )
}
