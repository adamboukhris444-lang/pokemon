import { useEffect, useState } from 'react'
import { API } from './api.js'

const ETAT_OPTIONS = ['Near Mint', 'Excellent', 'Bon état', 'Joué', 'Abîmé', 'Gradée']
const GRADE_NOTES = ['10', '9.5', '9', '8.5', '8', '7', '6', '5 et moins']

const initialForm = {
  type: 'scelle',
  nom: '', prix_achat: '', cote_actuelle: '', image: '', quantite: '1',
  etat: '', grading_company: '', grade_note: '', bloc: '', set_extension: '', numero_carte: '',
}

function Field({ label, optional, children }) {
  return (
    <label className="flex flex-col gap-1.5 font-semibold text-sm">
      {label}
      {optional && <span className="font-normal text-xs text-gray-400">{optional}</span>}
      {children}
    </label>
  )
}

const inputCls = 'px-3 py-2.5 rounded-lg border-2 border-gray-300 text-base focus:border-poke-dark outline-none transition-colors'

export default function AddItemPage({ token, user, onItemAdded, onLogin }) {
  const [form, setForm] = useState(initialForm)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [extensions, setExtensions] = useState([])
  const [gradingCompanies, setGradingCompanies] = useState([])

  const blocs = [...new Set(extensions.map((e) => e.bloc).filter(Boolean))]
  const extensionsForBloc = extensions.filter((e) => e.bloc === form.bloc)

  useEffect(() => {
    fetch(`${API}/api/extensions`).then((r) => r.json()).then(setExtensions).catch(() => {})
    fetch(`${API}/api/societes-gradation`).then((r) => r.json()).then(setGradingCompanies).catch(() => {})
  }, [])

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
  function handleBlocChange(e) { setForm({ ...form, bloc: e.target.value, set_extension: '' }) }
  function setType(type) { setForm({ ...form, type }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: form.type,
          nom: form.nom,
          prix_achat: Number(form.prix_achat),
          cote_actuelle: form.cote_actuelle ? Number(form.cote_actuelle) : Number(form.prix_achat),
          image: form.image || null,
          quantite: Number(form.quantite) || 1,
          etat: form.type === 'carte'
            ? (form.etat === 'Gradée' && form.grading_company
                ? `Gradée — ${form.grading_company}${form.grade_note ? ` ${form.grade_note}` : ''}`
                : form.etat || null)
            : null,
          set_extension: form.type === 'carte' ? (form.set_extension || null) : null,
          numero_carte: form.type === 'carte' ? (form.numero_carte || null) : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Échec de l\'enregistrement.')
      setSuccess(data.nom)
      setForm({ ...initialForm, type: form.type })
      onItemAdded?.(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center my-16">
        <div className="text-5xl mb-4">🔒</div>
        <p className="font-bold text-gray-700 text-lg mb-5">Connectez-vous pour ajouter un achat</p>
        <button onClick={onLogin} className="px-6 py-2.5 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300 transition-colors">
          Se connecter
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-4 pb-10">
      <h1 className="text-center text-3xl font-bold mb-6">Ajouter un achat</h1>

      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border-2 border-green-300 text-green-800 text-sm font-semibold text-center">
          ✓ « {success} » ajouté à votre collection.
        </div>
      )}

      <div className="flex gap-2 mb-5 justify-center">
        {[
          { id: 'scelle', label: 'Scellé' },
          { id: 'carte', label: 'Carte' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`px-5 py-2 rounded-full border-2 border-poke-dark font-semibold cursor-pointer transition-colors ${
              form.type === t.id ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
            }`}
          >
            {t.id === 'scelle' ? '📦 ' : '🃏 '}{t.label}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-4 bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm" onSubmit={handleSubmit}>
        <Field label={form.type === 'carte' ? 'Nom de la carte' : "Nom de l'item"}>
          <input
            className={inputCls} type="text" name="nom" value={form.nom} onChange={handleChange} required
            placeholder={form.type === 'carte' ? 'ex: Pikachu Illustrator' : 'ex: ETB Évolutions Prismatiques'}
          />
        </Field>

        {form.type === 'carte' && (
          <>
            <Field label="Bloc" optional="(optionnel)">
              <select className={inputCls} name="bloc" value={form.bloc} onChange={handleBlocChange}>
                <option value="">— Sélectionner —</option>
                {blocs.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>

            <Field label="Série" optional="(optionnel)">
              <select className={inputCls} name="set_extension" value={form.set_extension} onChange={handleChange} disabled={!form.bloc}>
                <option value="">{form.bloc ? '— Sélectionner —' : 'Choisissez d\'abord un bloc'}</option>
                {extensionsForBloc.map((e) => (
                  <option key={e.id} value={e.nom}>{e.nom}{e.code ? ` (${e.code})` : ''}</option>
                ))}
              </select>
            </Field>

            <Field label="Numéro de carte" optional="(optionnel)">
              <input className={inputCls} type="text" name="numero_carte" value={form.numero_carte} onChange={handleChange} placeholder="ex: 25/198" />
            </Field>

            <Field label="État / Gradation" optional="(optionnel)">
              <select className={inputCls} name="etat" value={form.etat} onChange={handleChange}>
                <option value="">— Sélectionner —</option>
                {ETAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>

            {form.etat === 'Gradée' && (
              <>
                <Field label="Société de gradation" optional="(optionnel)">
                  <select className={inputCls} name="grading_company" value={form.grading_company} onChange={handleChange}>
                    <option value="">— Sélectionner —</option>
                    {gradingCompanies.map((c) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                  </select>
                </Field>
                <Field label="Note" optional="(optionnel)">
                  <select className={inputCls} name="grade_note" value={form.grade_note} onChange={handleChange}>
                    <option value="">— Sélectionner —</option>
                    {GRADE_NOTES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </>
            )}
          </>
        )}

        <Field label="Prix d'achat (€)">
          <input className={inputCls} type="number" name="prix_achat" value={form.prix_achat} onChange={handleChange} step="0.01" min="0" required />
        </Field>

        <Field label="Quantité">
          <input className={inputCls} type="number" name="quantite" value={form.quantite} onChange={handleChange} min="1" step="1" required />
        </Field>

        <Field label="Cote actuelle (€)" optional="(optionnel — par défaut = prix d'achat)">
          <input className={inputCls} type="number" name="cote_actuelle" value={form.cote_actuelle} onChange={handleChange} step="0.01" min="0" />
        </Field>

        <Field label="Image (URL)" optional="(optionnel)">
          <input className={inputCls} type="text" name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
        </Field>

        {error && <p className="text-red-700 text-sm text-center font-medium">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="mt-1 py-3 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
        >
          {submitting ? 'Enregistrement...' : 'Ajouter à ma collection'}
        </button>
      </form>
    </div>
  )
}
