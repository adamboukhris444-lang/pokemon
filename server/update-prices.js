// Met à jour la cote actuelle de chaque item de la collection en interrogeant
// les marketplaces configurées (eBay, Cardmarket, Vinted).
//
// Usage :
//   npm run update-prices                 # toutes les sources configurées
//   npm run update-prices -- --dry-run    # n'écrit rien, affiche seulement
//   npm run update-prices -- --source ebay  # force une seule source
//   npm run update-prices -- --id 2       # un seul item (par id)
//
// Conçu pour être lancé en cron par Hermes Agent : `node server/update-prices.js`

import 'dotenv/config'
import { pool } from './db.js'
import * as ebay from './sources/ebay.js'
import * as cardmarket from './sources/cardmarket.js'
import * as vinted from './sources/vinted.js'

// Ordre de priorité : la première source qui renvoie un prix gagne.
const ALL_SOURCES = [ebay, cardmarket, vinted]

function parseArgs(argv) {
  const args = { dryRun: false, source: null, id: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true
    else if (argv[i] === '--source') args.source = argv[++i]
    else if (argv[i] === '--id') args.id = Number(argv[++i])
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let sources = ALL_SOURCES.filter((s) => s.isConfigured())
  if (args.source) sources = sources.filter((s) => s.id === args.source)

  if (sources.length === 0) {
    console.error(
      'Aucune source configurée. Renseignez au moins EBAY_CLIENT_ID/SECRET dans .env ' +
        '(ou CM_* pour Cardmarket, VINTED_ENABLED=true pour Vinted).'
    )
    process.exitCode = 1
    return
  }
  console.log('Sources actives :', sources.map((s) => s.id).join(', '))

  const where = args.id ? 'WHERE id = $1' : 'WHERE nom IS NOT NULL'
  const params = args.id ? [args.id] : []
  const { rows: items } = await pool.query(`SELECT * FROM item ${where} ORDER BY id ASC`, params)

  let updated = 0
  for (const item of items) {
    let result = null
    let usedSource = null

    for (const source of sources) {
      try {
        const r = await source.getPrice(item.nom)
        if (r && r.price > 0) {
          result = r
          usedSource = source.id
          break
        }
      } catch (err) {
        console.warn(`  [${source.id}] "${item.nom}" : ${err.message}`)
      }
    }

    if (!result) {
      console.log(`✗ ${item.nom} : aucun prix trouvé`)
      continue
    }

    const arrow = result.price >= Number(item.cote_actuelle || 0) ? '▲' : '▼'
    console.log(
      `${arrow} ${item.nom} : ${item.cote_actuelle ?? '—'} € → ${result.price} € ` +
        `(${usedSource}, ${result.samples} annonces)`
    )

    if (!args.dryRun) {
      await pool.query(
        `UPDATE item
         SET cote_actuelle = $1, cote_source = $2, cote_samples = $3, cote_updated_at = now()
         WHERE id = $4`,
        [result.price, usedSource, result.samples, item.id]
      )
      updated++
    }
  }

  console.log(`\n${args.dryRun ? '[dry-run] ' : ''}${updated} item(s) mis à jour.`)
}

main()
  .catch((err) => {
    console.error('Erreur fatale :', err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
