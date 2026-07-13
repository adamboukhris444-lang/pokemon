import { useEffect, useState } from 'react'

function formatEuro(value) {
  return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMaj(item) {
  if (!item.cote_updated_at) return '—'
  const d = new Date(item.cote_updated_at)
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return item.cote_source ? `${date} · ${item.cote_source}` : date
}

function GainCell({ value, children }) {
  return (
    <td className={`px-4 py-3 border-b border-gray-100 font-semibold ${value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
      {children}
    </td>
  )
}

export default function ItemsPage({ token, user, onLogin }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [filter, setFilter] = useState('tous')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    async function loadItems() {
      try {
        const res = await fetch('http://localhost:3001/api/items', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('request failed')
        const data = await res.json()
        setItems(data)
      } catch (e) {
        setError("Impossible de charger la collection.")
      } finally {
        setLoading(false)
      }
    }
    loadItems()
  }, [token])

  function startEdit(item, field) {
    setEditing({ id: item.id, field })
    if (field === 'cote_actuelle') setEditValue(Number(item.cote_actuelle).toFixed(2))
    else if (field === 'quantite') setEditValue(String(item.quantite ?? 1))
    else if (field === 'image') setEditValue(item.image ?? '')
  }

  async function saveEdit() {
    const { id, field } = editing
    setSaving(true)
    try {
      const body = field === 'cote_actuelle'
        ? { cote_actuelle: Number(editValue) }
        : field === 'quantite'
        ? { quantite: Number(editValue) }
        : { image: editValue || null }
      const res = await fetch(`http://localhost:3001/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      setEditing(null)
    } catch {
      alert('Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') setEditing(null)
  }

  const filtered = items.filter((i) => filter === 'tous' || (i.type || 'scelle') === filter)

  const totalAchat = filtered.reduce((sum, i) => sum + Number(i.prix_achat || 0) * Number(i.quantite || 1), 0)
  const totalCote = filtered.reduce((sum, i) => sum + Number(i.cote_actuelle || 0) * Number(i.quantite || 1), 0)
  const totalGain = totalCote - totalAchat
  const totalPct = totalAchat !== 0 ? (totalGain / totalAchat) * 100 : null

  return (
    <div className="py-4 pb-10">
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="aperçu" className="w-full rounded-lg object-contain max-h-96" />
            <button onClick={() => setPreviewUrl(null)} className="mt-3 w-full py-2 rounded-full border-2 border-poke-dark font-bold hover:bg-gray-100">Fermer</button>
          </div>
        </div>
      )}
      <h1 className="text-center text-3xl font-bold mb-4">📦 Ma Collection</h1>

      <div className="flex justify-center gap-2 mb-6">
        {[
          { id: 'tous', label: 'Tout' },
          { id: 'scelle', label: '📦 Scellés' },
          { id: 'carte', label: '🃏 Cartes' },
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

      {!user && !loading && (
        <div className="text-center my-12 text-gray-400">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-semibold text-gray-600">Connectez-vous pour voir votre collection</p>
          <button onClick={onLogin} className="mt-4 px-6 py-2 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300">
            Se connecter
          </button>
        </div>
      )}
      {loading && <p className="text-center text-lg my-8">Chargement de la collection...</p>}
      {error && <p className="text-center text-lg my-8 text-red-700">{error}</p>}

      {!loading && !error && (
        <>
          <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Image</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Nom</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Qté</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Prix d'achat</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Cote actuelle</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Plus/Moins-value</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">%</th>
                <th className="px-4 py-3 text-left bg-poke-dark text-white">Dernière MAJ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const qty = Number(item.quantite || 1)
                const achat = Number(item.prix_achat || 0) * qty
                const cote = Number(item.cote_actuelle || 0) * qty
                const gain = cote - achat
                const pct = achat !== 0 ? (gain / achat) * 100 : 0
                const isEditingCote = editing?.id === item.id && editing?.field === 'cote_actuelle'
                const isEditingQty = editing?.id === item.id && editing?.field === 'quantite'
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 border-b border-gray-100">
                      {editing?.id === item.id && editing?.field === 'image' ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            placeholder="https://..."
                            className="w-40 border-2 border-poke-dark rounded px-2 py-0.5 text-sm"
                          />
                          <button onClick={saveEdit} disabled={saving} className="text-green-700 font-bold text-lg leading-none">✓</button>
                          <button onClick={() => setEditing(null)} className="text-gray-400 font-bold text-lg leading-none">✕</button>
                        </span>
                      ) : item.image ? (
                        <span className="flex items-center gap-2">
                          <button onClick={() => setPreviewUrl(item.image)} className="text-lg">🖼️</button>
                          <button onClick={() => startEdit(item, 'image')} className="text-gray-400 hover:text-poke-dark text-sm">✏️</button>
                        </span>
                      ) : (
                        <button onClick={() => startEdit(item, 'image')} className="text-gray-300 hover:text-poke-dark text-sm">+ lien</button>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <span className="capitalize">{item.nom}</span>
                      {item.type === 'carte' && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {[item.set_extension, item.numero_carte, item.etat].filter(Boolean).join(' · ') || 'Carte'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      {isEditingQty ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="number" step="1" min="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-16 border-2 border-poke-dark rounded px-2 py-0.5 text-sm"
                          />
                          <button onClick={saveEdit} disabled={saving} className="text-green-700 font-bold text-lg leading-none">✓</button>
                          <button onClick={() => setEditing(null)} className="text-gray-400 font-bold text-lg leading-none">✕</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {qty}
                          <button onClick={() => startEdit(item, 'quantite')} className="text-gray-400 hover:text-poke-dark text-sm">✏️</button>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">{formatEuro(item.prix_achat)} €</td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      {isEditingCote ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="number" step="0.01" min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-24 border-2 border-poke-dark rounded px-2 py-0.5 text-sm"
                          />
                          <button onClick={saveEdit} disabled={saving} className="text-green-700 font-bold text-lg leading-none">✓</button>
                          <button onClick={() => setEditing(null)} className="text-gray-400 font-bold text-lg leading-none">✕</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {formatEuro(item.cote_actuelle)} €
                          <button onClick={() => startEdit(item, 'cote_actuelle')} className="text-gray-400 hover:text-poke-dark text-sm">✏️</button>
                        </span>
                      )}
                    </td>
                    <GainCell value={gain}>
                      {gain >= 0 ? '+' : ''}{formatEuro(gain)} €
                    </GainCell>
                    <GainCell value={pct}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)} %
                    </GainCell>
                    <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500">
                      {formatMaj(item)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-4 py-3 border-t-2 border-poke-dark"></td>
                <td className="px-4 py-3 font-bold border-t-2 border-poke-dark">Total</td>
                <td className="px-4 py-3 font-bold border-t-2 border-poke-dark">{filtered.reduce((s, i) => s + Number(i.quantite || 1), 0)}</td>
                <td className="px-4 py-3 font-bold border-t-2 border-poke-dark">{formatEuro(totalAchat)} €</td>
                <td className="px-4 py-3 font-bold border-t-2 border-poke-dark">{formatEuro(totalCote)} €</td>
                <td className={`px-4 py-3 font-bold border-t-2 border-poke-dark ${totalGain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {totalGain >= 0 ? '+' : ''}{formatEuro(totalGain)} €
                </td>
                <td className={`px-4 py-3 font-bold border-t-2 border-poke-dark ${totalGain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {totalPct !== null ? `${totalGain >= 0 ? '+' : ''}${totalPct.toFixed(1)} %` : '—'}
                </td>
                <td className="px-4 py-3 border-t-2 border-poke-dark"></td>
              </tr>
            </tfoot>
          </table>

          {filtered.length === 0 && <p className="text-center text-lg my-8">Aucun item dans cette catégorie.</p>}
        </>
      )}
    </div>
  )
}
