import { useEffect, useMemo, useState } from 'react'
import { API } from './api.js'

function euro(val) {
  return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMaj(item) {
  if (!item.cote_updated_at) return '—'
  const d = new Date(item.cote_updated_at)
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return item.cote_source ? `${date} · ${item.cote_source}` : date
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${accent || 'text-poke-dark'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SortTh({ label, field, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === field
  return (
    <th
      className={`px-4 py-3 text-left bg-poke-dark text-white cursor-pointer select-none hover:bg-gray-700 transition-colors whitespace-nowrap ${className}`}
      onClick={() => onSort(field)}
    >
      {label}
      <span className="ml-1 text-xs">
        {active ? (sortDir === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}
      </span>
    </th>
  )
}

export default function ItemsPage({ token, user, onLogin }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [filter, setFilter] = useState('tous')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${API}/api/items`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setItems)
      .catch(() => setError('Impossible de charger la collection.'))
      .finally(() => setLoading(false))
  }, [token])

  function startEdit(item, field) {
    setEditing({ id: item.id, field })
    setEditError(null)
    if (field === 'cote_actuelle') setEditValue(Number(item.cote_actuelle).toFixed(2))
    else if (field === 'quantite') setEditValue(String(item.quantite ?? 1))
    else setEditValue(item.image ?? '')
  }

  async function saveEdit() {
    const { id, field } = editing
    setSaving(true)
    setEditError(null)
    try {
      const body = field === 'cote_actuelle'
        ? { cote_actuelle: Number(editValue) }
        : field === 'quantite'
        ? { quantite: Number(editValue) }
        : { image: editValue || null }
      const res = await fetch(`${API}/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      setEditing(null)
    } catch {
      setEditError('Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id) {
    try {
      const res = await fetch(`${API}/api/items/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((i) => i.id !== id))
      setConfirmDelete(null)
    } catch {
      setEditError('Impossible de supprimer cet item.')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') setEditing(null)
  }

  function toggleSort(field) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortDir('asc') }
  }

  const filtered = items.filter((i) => filter === 'tous' || (i.type || 'scelle') === filter)

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv
      switch (sortBy) {
        case 'nom': av = (a.nom || '').toLowerCase(); bv = (b.nom || '').toLowerCase(); break
        case 'prix_achat': av = Number(a.prix_achat); bv = Number(b.prix_achat); break
        case 'cote_actuelle': av = Number(a.cote_actuelle); bv = Number(b.cote_actuelle); break
        case 'gain':
          av = (Number(a.cote_actuelle) - Number(a.prix_achat)) * Number(a.quantite || 1)
          bv = (Number(b.cote_actuelle) - Number(b.prix_achat)) * Number(b.quantite || 1)
          break
        default: av = a.id; bv = b.id
      }
      if (av === bv) return 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }, [filtered, sortBy, sortDir])

  const totalQty = filtered.reduce((s, i) => s + Number(i.quantite || 1), 0)
  const totalAchat = filtered.reduce((s, i) => s + Number(i.prix_achat || 0) * Number(i.quantite || 1), 0)
  const totalCote = filtered.reduce((s, i) => s + Number(i.cote_actuelle || 0) * Number(i.quantite || 1), 0)
  const totalGain = totalCote - totalAchat
  const totalPct = totalAchat !== 0 ? (totalGain / totalAchat) * 100 : null

  if (!user && !loading) {
    return (
      <div className="text-center my-16">
        <div className="text-5xl mb-4">🔒</div>
        <p className="font-bold text-gray-700 text-lg mb-5">Connectez-vous pour voir votre collection</p>
        <button onClick={onLogin} className="px-6 py-2.5 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300 transition-colors">
          Se connecter
        </button>
      </div>
    )
  }

  return (
    <div className="py-4 pb-10">
      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="aperçu" className="w-full rounded-lg object-contain max-h-96" />
            <button onClick={() => setPreviewUrl(null)} className="mt-3 w-full py-2 rounded-full border-2 border-poke-dark font-bold hover:bg-gray-50">Fermer</button>
          </div>
        </div>
      )}

      <h1 className="text-center text-3xl font-bold mb-6">Ma Collection</h1>

      {/* Stats cards */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Items" value={totalQty} sub={`${filtered.length} ligne${filtered.length !== 1 ? 's' : ''}`} />
          <StatCard label="Investi" value={`${euro(totalAchat)} €`} />
          <StatCard label="Valeur actuelle" value={`${euro(totalCote)} €`} />
          <StatCard
            label="Plus/Moins-value"
            value={`${totalGain >= 0 ? '+' : ''}${euro(totalGain)} €`}
            sub={totalPct !== null ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)} %` : undefined}
            accent={totalGain >= 0 ? 'text-green-700' : 'text-red-700'}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex justify-center gap-2 mb-4">
        {[
          { id: 'tous', label: 'Tout' },
          { id: 'scelle', label: 'Scellés' },
          { id: 'carte', label: 'Cartes' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full border-2 border-poke-dark font-semibold text-sm cursor-pointer transition-colors ${
              filter === f.id ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {editError && <p className="text-center text-red-700 text-sm mb-3 font-medium">{editError}</p>}
      {loading && <p className="text-center text-gray-500 my-10">Chargement de la collection...</p>}
      {error && <p className="text-center text-red-700 my-8">{error}</p>}

      {!loading && !error && (
        <>
          {sorted.length > 0 ? (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
              <table className="w-full border-collapse bg-white min-w-[820px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left bg-poke-dark text-white w-14 text-sm">Image</th>
                    <SortTh label="Nom" field="nom" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left bg-poke-dark text-white w-16 text-sm">Qté</th>
                    <SortTh label="Prix d'achat" field="prix_achat" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="Cote actuelle" field="cote_actuelle" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="+/− value" field="gain" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left bg-poke-dark text-white text-sm">%</th>
                    <th className="px-4 py-3 text-left bg-poke-dark text-white text-sm whitespace-nowrap">Dernière MAJ</th>
                    <th className="px-4 py-3 bg-poke-dark w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => {
                    const qty = Number(item.quantite || 1)
                    const achat = Number(item.prix_achat || 0) * qty
                    const cote = Number(item.cote_actuelle || 0) * qty
                    const gain = cote - achat
                    const pct = achat !== 0 ? (gain / achat) * 100 : 0
                    const isEditingCote = editing?.id === item.id && editing?.field === 'cote_actuelle'
                    const isEditingQty = editing?.id === item.id && editing?.field === 'quantite'
                    const isEditingImg = editing?.id === item.id && editing?.field === 'image'
                    const isDel = confirmDelete === item.id

                    return (
                      <tr key={item.id} className={`border-b border-gray-100 ${isDel ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors`}>
                        {/* Image */}
                        <td className="px-4 py-3">
                          {isEditingImg ? (
                            <span className="flex items-center gap-1">
                              <input
                                type="text" value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown} autoFocus
                                placeholder="https://..."
                                className="w-32 border-2 border-poke-dark rounded px-2 py-0.5 text-sm"
                              />
                              <button onClick={saveEdit} disabled={saving} className="text-green-700 font-bold text-lg">✓</button>
                              <button onClick={() => setEditing(null)} className="text-gray-400 font-bold text-lg">✕</button>
                            </span>
                          ) : item.image ? (
                            <span className="flex items-center gap-1.5">
                              <button onClick={() => setPreviewUrl(item.image)} title="Voir l'image">🖼️</button>
                              <button onClick={() => startEdit(item, 'image')} className="text-gray-300 hover:text-poke-dark text-xs" title="Modifier">✏️</button>
                            </span>
                          ) : (
                            <button onClick={() => startEdit(item, 'image')} className="text-xs text-gray-300 hover:text-poke-dark whitespace-nowrap">+ image</button>
                          )}
                        </td>

                        {/* Nom */}
                        <td className="px-4 py-3">
                          <p className="capitalize font-medium text-sm">{item.nom}</p>
                          {item.type === 'carte' && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {[item.set_extension, item.numero_carte, item.etat].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>

                        {/* Quantité */}
                        <td className="px-4 py-3">
                          {isEditingQty ? (
                            <span className="flex items-center gap-1">
                              <input type="number" step="1" min="1" value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown} autoFocus
                                className="w-14 border-2 border-poke-dark rounded px-2 py-0.5 text-sm"
                              />
                              <button onClick={saveEdit} disabled={saving} className="text-green-700 font-bold text-lg">✓</button>
                              <button onClick={() => setEditing(null)} className="text-gray-400 font-bold text-lg">✕</button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm">
                              {qty}
                              <button onClick={() => startEdit(item, 'quantite')} className="text-gray-300 hover:text-poke-dark text-xs">✏️</button>
                            </span>
                          )}
                        </td>

                        {/* Prix achat */}
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{euro(item.prix_achat)} €</td>

                        {/* Cote */}
                        <td className="px-4 py-3">
                          {isEditingCote ? (
                            <span className="flex items-center gap-1">
                              <input type="number" step="0.01" min="0" value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown} autoFocus
                                className="w-20 border-2 border-poke-dark rounded px-2 py-0.5 text-sm"
                              />
                              <button onClick={saveEdit} disabled={saving} className="text-green-700 font-bold text-lg">✓</button>
                              <button onClick={() => setEditing(null)} className="text-gray-400 font-bold text-lg">✕</button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                              {euro(item.cote_actuelle)} €
                              <button onClick={() => startEdit(item, 'cote_actuelle')} className="text-gray-300 hover:text-poke-dark text-xs">✏️</button>
                            </span>
                          )}
                        </td>

                        {/* Gain */}
                        <td className={`px-4 py-3 font-semibold text-sm whitespace-nowrap ${gain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {gain >= 0 ? '+' : ''}{euro(gain)} €
                        </td>
                        <td className={`px-4 py-3 font-semibold text-sm whitespace-nowrap ${pct >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {pct >= 0 ? '+' : ''}{pct.toFixed(1)} %
                        </td>

                        {/* MAJ */}
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatMaj(item)}</td>

                        {/* Supprimer */}
                        <td className="px-3 py-3">
                          {isDel ? (
                            <span className="flex flex-col gap-1">
                              <button onClick={() => deleteItem(item.id)} className="text-xs text-white bg-red-600 rounded px-2 py-0.5 font-semibold whitespace-nowrap hover:bg-red-700">
                                Confirmer
                              </button>
                              <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:text-gray-700">Annuler</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(item.id)}
                              className="text-gray-200 hover:text-red-500 transition-colors text-lg leading-none"
                              title="Supprimer"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 border-t-2 border-poke-dark"></td>
                    <td className="px-4 py-3 font-bold border-t-2 border-poke-dark text-sm">Total</td>
                    <td className="px-4 py-3 font-bold border-t-2 border-poke-dark text-sm">{totalQty}</td>
                    <td className="px-4 py-3 font-bold border-t-2 border-poke-dark text-sm whitespace-nowrap">{euro(totalAchat)} €</td>
                    <td className="px-4 py-3 font-bold border-t-2 border-poke-dark text-sm whitespace-nowrap">{euro(totalCote)} €</td>
                    <td className={`px-4 py-3 font-bold border-t-2 border-poke-dark text-sm whitespace-nowrap ${totalGain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {totalGain >= 0 ? '+' : ''}{euro(totalGain)} €
                    </td>
                    <td className={`px-4 py-3 font-bold border-t-2 border-poke-dark text-sm ${totalGain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {totalPct !== null ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)} %` : '—'}
                    </td>
                    <td className="px-4 py-3 border-t-2 border-poke-dark" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center my-12 text-gray-400">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-semibold text-gray-600">
                {filter !== 'tous' ? `Aucun ${filter === 'scelle' ? 'scellé' : 'carte'} dans votre collection` : 'Votre collection est vide'}
              </p>
              <p className="text-sm mt-1 text-gray-400">Ajoutez vos premiers items via « Ajouter ».</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
