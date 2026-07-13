import { useEffect, useState } from 'react'

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
      {label} {optional && <span className="font-normal text-xs text-gray-400">{optional}</span>}
      {children}
    </label>
  )
}

const inputClass = 'px-3 py-2.5 rounded-lg border-2 border-gray-300 text-base focus:border-poke-dark outline-none'

export default function AddItemPage({ token, user, onItemAdded, onLogin }) {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [extensions, setExtensions] = useState([])
  const [gradingCompanies, setGradingCompanies] = useState([])

  const blocs = [...new Set(extensions.map((ext) => ext.bloc).filter(Boolean))]
  const extensionsForBloc = extensions.filter((ext) => ext.bloc === form.bloc)

  useEffect(() => {
    fetch('http://localhost:3001/api/extensions').then((r) => r.json()).then(setExtensions).catch(() => {})
    fetch('http://localhost:3001/api/societes-gradation').then((r) => r.json()).then(setGradingCompanies).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleBlocChange(e) {
    setForm({ ...form, bloc: e.target.value, set_extension: '' })
  }

  function setType(type) {
    setForm({ ...form, type })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)

    try {
      const res = await fetch('http://localhost:3001/api/items', {
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Échec de l\'enregistrement.')
      }

      const newItem = await res.json()
      setStatus({ type: 'success', message: `"${newItem.nom}" ajouté avec succès.` })
      setForm({ ...initialForm, type: form.type })
      onItemAdded?.(newItem)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return (
    <div className="text-center my-12 text-gray-400">
      <p className="text-4xl mb-3">🔒</p>
      <p className="font-semibold text-gray-600">Connectez-vous pour ajouter un achat</p>
      <button onClick={onLogin} className="mt-4 px-6 py-2 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer hover:bg-yellow-300">
        Se connecter
      </button>
    </div>
  )

  return (
    <div className="max-w-md mx-auto py-4 pb-10">
      <h1 className="text-center text-3xl font-bold mb-6">🛒 Ajouter un achat</h1>

      <div className="flex gap-2 mb-4 justify-center">
        <button
          type="button"
          onClick={() => setType('scelle')}
          className={`px-5 py-2 rounded-full border-2 border-poke-dark font-semibold cursor-pointer transition-colors ${
            form.type === 'scelle' ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
          }`}
        >
          📦 Item scellé
        </button>
        <button
          type="button"
          onClick={() => setType('carte')}
          className={`px-5 py-2 rounded-full border-2 border-poke-dark font-semibold cursor-pointer transition-colors ${
            form.type === 'carte' ? 'bg-poke-yellow' : 'bg-white hover:bg-gray-50'
          }`}
        >
          🃏 Carte
        </button>
      </div>

      <form className="flex flex-col gap-4 bg-white border-2 border-poke-dark rounded-2xl p-6" onSubmit={handleSubmit}>
        <Field label={form.type === 'carte' ? 'Nom de la carte' : "Nom de l'item"}>
          <input
            className={inputClass}
            type="text"
            name="nom"
            value={form.nom}
            onChange={handleChange}
            placeholder={form.type === 'carte' ? 'ex: Pikachu Illustrator' : 'ex: ETB Évolutions Prismatiques'}
            required
          />
        </Field>

        {form.type === 'carte' && (
          <>
            <Field label="Bloc" optional="(optionnel)">
              <select
                className={inputClass}
                name="bloc"
                value={form.bloc}
                onChange={handleBlocChange}
              >
                <option value="">— Sélectionner —</option>
                {blocs.map((bloc) => (
                  <option key={bloc} value={bloc}>{bloc}</option>
                ))}
              </select>
            </Field>

            <Field label="Série" optional="(optionnel)">
              <select
                className={inputClass}
                name="set_extension"
                value={form.set_extension}
                onChange={handleChange}
                disabled={!form.bloc}
              >
                <option value="">{form.bloc ? '— Sélectionner —' : 'Choisissez d\'abord un bloc'}</option>
                {extensionsForBloc.map((ext) => (
                  <option key={ext.id} value={ext.nom}>
                    {ext.nom}{ext.code ? ` (${ext.code})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Numéro de carte" optional="(optionnel)">
              <input
                className={inputClass}
                type="text"
                name="numero_carte"
                value={form.numero_carte}
                onChange={handleChange}
                placeholder="ex: 25/198"
              />
            </Field>

            <Field label="État / Gradation" optional="(optionnel)">
              <select
                className={inputClass}
                name="etat"
                value={form.etat}
                onChange={handleChange}
              >
                <option value="">— Sélectionner —</option>
                {ETAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>

            {form.etat === 'Gradée' && (
              <>
                <Field label="Société de gradation" optional="(optionnel)">
                  <select
                    className={inputClass}
                    name="grading_company"
                    value={form.grading_company}
                    onChange={handleChange}
                  >
                    <option value="">— Sélectionner —</option>
                    {gradingCompanies.map((c) => (
                      <option key={c.id} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Note" optional="(optionnel)">
                  <select
                    className={inputClass}
                    name="grade_note"
                    value={form.grade_note}
                    onChange={handleChange}
                  >
                    <option value="">— Sélectionner —</option>
                    {GRADE_NOTES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </>
        )}

        <Field label="Prix d'achat (€)">
          <input
            className={inputClass}
            type="number"
            name="prix_achat"
            value={form.prix_achat}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </Field>

        <Field label="Quantité">
          <input
            className={inputClass}
            type="number"
            name="quantite"
            value={form.quantite}
            onChange={handleChange}
            min="1"
            step="1"
            required
          />
        </Field>

        <Field label="Cote actuelle (€)" optional="(optionnel, par défaut = prix d'achat)">
          <input
            className={inputClass}
            type="number"
            name="cote_actuelle"
            value={form.cote_actuelle}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </Field>

        <Field label="Image (URL)" optional="(optionnel)">
          <input
            className={inputClass}
            type="text"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="https://..."
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 py-3 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
        >
          {submitting ? 'Enregistrement...' : 'Ajouter à ma collection'}
        </button>
      </form>

      {status && (
        <p className={`text-center text-lg mt-4 ${status.type === 'error' ? 'text-red-700' : ''}`}>
          {status.message}
        </p>
      )}
    </div>
  )
}
