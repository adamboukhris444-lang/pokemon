import { useEffect, useState } from 'react'
import { API } from './api.js'

const ETAT_OPTIONS = ['Near Mint', 'Excellent', 'Bon état', 'Joué', 'Abîmé', 'Gradée']
const inputCls = 'px-3 py-2.5 rounded-lg border-2 border-gray-300 text-base focus:border-poke-dark outline-none transition-colors'

function Field({ label, optional, children }) {
  return (
    <label className="flex flex-col gap-1.5 font-semibold text-sm">
      {label}
      {optional && <span className="font-normal text-xs text-gray-400">{optional}</span>}
      {children}
    </label>
  )
}

export default function PublierAnnoncePage({ token, onPublished, onBack }) {
  const [form, setForm] = useState({
    nom: '', categorie: '', etat: '', set_extension: '', numero_carte: '', prix: '', description: '', image_url: '',
  })
  const [extensions, setExtensions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/extensions`).then((r) => r.json()).then(setExtensions).catch(() => {})
  }, [])

  const extensionsByBloc = extensions.reduce((acc, ext) => {
    const bloc = ext.bloc || 'Autre'
    if (!acc[bloc]) acc[bloc] = []
    acc[bloc].push(ext)
    return acc
  }, {})

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/annonces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, prix: Number(form.prix) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur.')
      onPublished(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 pb-10">
      <button onClick={onBack} className="mb-4 px-4 py-2 rounded-full border-2 border-poke-dark font-semibold bg-white hover:bg-gray-50 cursor-pointer transition-colors">
        ← Retour
      </button>
      <h1 className="text-center text-3xl font-bold mb-6">Publier une annonce</h1>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <Field label="Nom de l'item / carte">
          <input className={inputCls} name="nom" value={form.nom} onChange={handleChange}
            placeholder="ex: Dracaufeu Holo, ETB Évolutions Prismatiques..." required />
        </Field>

        <Field label="Catégorie" optional="(optionnel)">
          <select className={inputCls} name="categorie" value={form.categorie} onChange={handleChange}>
            <option value="">— Sélectionner —</option>
            {['Carte', 'Booster', 'ETB', 'Display', 'Coffret', 'Tin', 'Bundle', 'Accessoire'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Extension / Set" optional="(optionnel)">
          <select className={inputCls} name="set_extension" value={form.set_extension} onChange={handleChange}>
            <option value="">— Sélectionner —</option>
            {Object.entries(extensionsByBloc).map(([bloc, exts]) => (
              <optgroup key={bloc} label={bloc}>
                {exts.map((e) => <option key={e.id} value={e.nom}>{e.nom}{e.code ? ` (${e.code})` : ''}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Numéro de carte" optional="(optionnel)">
          <input className={inputCls} name="numero_carte" value={form.numero_carte} onChange={handleChange} placeholder="ex: 4/102" />
        </Field>

        <Field label="État / Condition" optional="(optionnel)">
          <select className={inputCls} name="etat" value={form.etat} onChange={handleChange}>
            <option value="">— Sélectionner —</option>
            {ETAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        <Field label="Prix de vente (€)">
          <input className={inputCls} type="number" name="prix" value={form.prix} onChange={handleChange}
            step="0.01" min="0.01" required placeholder="ex: 49.99" />
        </Field>

        <Field label="Description" optional="(optionnel)">
          <textarea className={`${inputCls} resize-none`} name="description" value={form.description}
            onChange={handleChange} rows={3}
            placeholder="État précis, version, historique, échanges possibles..." />
        </Field>

        <Field label="Image (URL)" optional="(optionnel)">
          <input className={inputCls} name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
        </Field>

        {error && <p className="text-red-700 text-sm text-center font-medium">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="mt-1 py-3 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer disabled:opacity-60 hover:bg-yellow-300 transition-colors"
        >
          {submitting ? 'Publication...' : 'Publier l\'annonce'}
        </button>
      </form>
    </div>
  )
}
