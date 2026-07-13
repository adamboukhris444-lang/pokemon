import 'dotenv/config'
import { pool } from './db.js'
import { fetchExtensionsForEra } from './hermes-vps.js'

const ALL_ERAS = [
  'Set de Base / Jungle / Fossile / Team Rocket / Gym / Neo / e-Card (1999-2003)',
  'EX (2003-2007): EX Rubis & Saphir à EX Gardiens de la Puissance',
  'Diamant & Perle et Platine (2007-2009)',
  'HeartGold SoulSilver (2010)',
  'Noir & Blanc (2011-2013)',
  'XY (2013-2016)',
  'Soleil & Lune (2017-2019)',
  'Épée et Bouclier (2020-2022)',
  'Écarlate et Violet (2023-2025)',
  'Méga-Évolution (2026, le bloc le plus récent succédant à Écarlate et Violet)',
]

// node server/fetch-blocks.js              -> tout traiter, en vidant les tables
// node server/fetch-blocks.js retry 3 4 6  -> retraiter uniquement les ères à ces index (1-based), sans vider
const args = process.argv.slice(2)
const isRetry = args[0] === 'retry'
const ERAS = isRetry
  ? args.slice(1).map((i) => ALL_ERAS[Number(i) - 1]).filter(Boolean)
  : ALL_ERAS

async function main() {
  if (!isRetry) {
    await pool.query('TRUNCATE TABLE extension RESTART IDENTITY')
    await pool.query('TRUNCATE TABLE bloc RESTART IDENTITY CASCADE')
  }

  let totalInserted = 0

  for (const era of ERAS) {
    console.log(`\n--- ${era} ---`)
    try {
      const items = await fetchExtensionsForEra(era)
      console.log(`  ${items.length} sets trouvés`)

      for (const item of items) {
        if (!item.nom) continue
        const blocNom = item.bloc || era
        const blocRes = await pool.query(
          `INSERT INTO bloc (nom) VALUES ($1)
           ON CONFLICT (nom) DO UPDATE SET nom = $1 RETURNING id`,
          [blocNom]
        )
        const blocId = blocRes.rows[0].id

        await pool.query(
          `INSERT INTO extension (nom, bloc, bloc_id, code, ordre) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (nom) DO UPDATE SET bloc = $2, bloc_id = $3, code = $4, ordre = $5`,
          [item.nom.trim(), blocNom, blocId, item.code || null, item.ordre || 999]
        )
        totalInserted++
      }
    } catch (err) {
      console.error(`  ERREUR pour "${era}":`, err.message)
    }
  }

  console.log(`\nTerminé — ${totalInserted} sets insérés/mis à jour.`)
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
