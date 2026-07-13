import 'dotenv/config'
import { pool } from './db.js'

const BASE = 'https://api.tcgdex.net/v2/fr'
const BATCH = 20

// Séries internationales reconnues uniquement
const VALID_SERIES = new Set(['base', 'neo', 'ecard', 'ex', 'dp', 'pl', 'hgss', 'bw', 'xy', 'sm', 'swsh', 'sv', 'me'])
// ETB uniquement à partir de la Sun & Moon era (2017+) en France
const ETB_SERIES = new Set(['sm', 'swsh', 'sv', 'me'])

const MIN_CARDS_DISPLAY = 50   // au moins 50 cartes (total) pour un Display
const MIN_CARDS_ETB = 100      // au moins 100 cartes (total) pour un ETB

function getSeriesId(setId) {
  const m = setId.match(/^([a-zA-Z]+)/)
  return m ? m[1].toLowerCase() : ''
}

function totalCards(s) {
  return s.cardCount?.total || s.cardCount?.official || 0
}

async function fetchSetDetail(id) {
  try {
    const r = await fetch(`${BASE}/sets/${id}`)
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

async function main() {
  console.log('Récupération des sets TCGdex...')
  const r = await fetch(`${BASE}/sets`)
  if (!r.ok) throw new Error(`TCGdex erreur ${r.status}`)
  const allSets = await r.json()
  console.log(`Total brut : ${allSets.length} sets`)

  // Filtre 1 : série internationale reconnue + nombre de cartes minimum
  const forDisplay = allSets.filter(s => {
    const serie = getSeriesId(s.id)
    return VALID_SERIES.has(serie) && totalCards(s) >= MIN_CARDS_DISPLAY && !s.id.includes('.5')
  })

  const forETB = allSets.filter(s => {
    const serie = getSeriesId(s.id)
    return ETB_SERIES.has(serie) && totalCards(s) >= MIN_CARDS_ETB
  })

  console.log(`Displays retenus : ${forDisplay.length} | ETB retenus : ${forETB.length}`)

  // Récupère les détails (logo + date) pour les sets sélectionnés
  const allNeeded = [...new Set([...forDisplay.map(s => s.id), ...forETB.map(s => s.id)])]
  const detailMap = {}
  for (let i = 0; i < allNeeded.length; i += BATCH) {
    const batch = allNeeded.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(id => fetchSetDetail(id)))
    batch.forEach((id, j) => { if (results[j]) detailMap[id] = results[j] })
    process.stdout.write(`\rDétails : ${Math.min(i + BATCH, allNeeded.length)}/${allNeeded.length}`)
  }
  console.log('')

  // Suppression complète et réinsertion propre
  const { rowCount } = await pool.query(`DELETE FROM referentiel WHERE categorie IN ('ETB', 'Display')`)
  console.log(`${rowCount} anciennes entrées supprimées`)

  let cntETB = 0, cntDisplay = 0, skipped = 0

  // Displays
  for (const s of forDisplay) {
    const d = detailMap[s.id]
    if (!d) { skipped++; continue }
    const year = d.releaseDate ? parseInt(d.releaseDate.split('-')[0]) : null
    const dateSortie = d.releaseDate || null
    const logoUrl = d.logo ? `${d.logo}.png` : null
    await pool.query(
      `INSERT INTO referentiel (nom, categorie, source, annee, date_sortie, image_url)
       VALUES ($1, 'Display', 'tcgdex-seed', $2, $3, $4)
       ON CONFLICT (nom) DO UPDATE SET annee = COALESCE($2, referentiel.annee), date_sortie = COALESCE($3, referentiel.date_sortie), image_url = COALESCE($4, referentiel.image_url)`,
      [`Display — ${d.name}`, year, dateSortie, logoUrl]
    )
    cntDisplay++
  }

  // ETBs
  for (const s of forETB) {
    const d = detailMap[s.id]
    if (!d) { skipped++; continue }
    const year = d.releaseDate ? parseInt(d.releaseDate.split('-')[0]) : null
    const dateSortie = d.releaseDate || null
    const logoUrl = d.logo ? `${d.logo}.png` : null
    await pool.query(
      `INSERT INTO referentiel (nom, categorie, source, annee, date_sortie, image_url)
       VALUES ($1, 'ETB', 'tcgdex-seed', $2, $3, $4)
       ON CONFLICT (nom) DO UPDATE SET annee = COALESCE($2, referentiel.annee), date_sortie = COALESCE($3, referentiel.date_sortie), image_url = COALESCE($4, referentiel.image_url)`,
      [`ETB — ${d.name}`, year, dateSortie, logoUrl]
    )
    cntETB++
  }

  console.log(`\nInsérés — ETB : ${cntETB} | Displays : ${cntDisplay} | ignorés : ${skipped}`)

  // Résumé final
  const check = await pool.query(
    `SELECT categorie, COUNT(*) as n, MIN(annee) as plus_ancien, MAX(annee) as plus_recent
     FROM referentiel WHERE categorie IN ('ETB','Display') GROUP BY categorie ORDER BY categorie`
  )
  console.log('\nBilan :')
  check.rows.forEach(r => console.log(`  ${r.categorie}: ${r.n} entrées | ${r.plus_ancien} → ${r.plus_recent}`))

  await pool.end()
  console.log('Terminé !')
}

main().catch(err => { console.error(err); process.exit(1) })
