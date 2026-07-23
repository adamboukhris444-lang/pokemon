import 'dotenv/config'
import { pool } from './db.js'

// Correspondance manuelle ETB nom DB → set TCGdex
// Format logo : https://assets.tcgdex.net/fr/{serie}/{setId}/logo
const ETB_MAP = [
  // Écarlate et Violet (sv)
  { nom: 'ETB — Écarlate et Violet',              setId: 'sv01',    serie: 'sv' },
  { nom: 'ETB — Évolutions à Paldea',             setId: 'sv02',    serie: 'sv' },
  { nom: 'ETB — Flammes Obsidiennes',             setId: 'sv03',    serie: 'sv' },
  { nom: 'ETB — 151',                              setId: 'sv03.5',  serie: 'sv' },
  { nom: 'ETB — Faille Paradoxe',                 setId: 'sv04',    serie: 'sv' },
  { nom: 'ETB — Destinées de Paldea',             setId: 'sv04.5',  serie: 'sv' },
  { nom: 'ETB — Forces Temporelles',              setId: 'sv05',    serie: 'sv' },
  { nom: 'ETB — Mascarade Crépusculaire',         setId: 'sv06',    serie: 'sv' },
  { nom: 'ETB — Couronne Stellaire',              setId: 'sv07',    serie: 'sv' },
  { nom: 'ETB — Étincelles Déferlantes',          setId: 'sv08',    serie: 'sv' },
  { nom: 'ETB — Évolutions Prismatiques',         setId: 'sv08.5',  serie: 'sv' },
  { nom: 'ETB — Aventures Ensemble',              setId: 'sv09',    serie: 'sv' },
  { nom: 'ETB — Rivalités Destinées',             setId: 'sv10',    serie: 'sv' },
  { nom: 'ETB — Flamme Blanche',                  setId: 'sv10.5w', serie: 'sv' },
  { nom: 'ETB — Foudre Noire',                    setId: 'sv10.5b', serie: 'sv' },
  // Épée et Bouclier (swsh)
  { nom: 'ETB — Épée et Bouclier',                setId: 'swsh1',   serie: 'swsh' },
  { nom: 'ETB — Clash des Rebelles',              setId: 'swsh2',   serie: 'swsh' },
  { nom: 'ETB — Ténèbres Embrasées',              setId: 'swsh3',   serie: 'swsh' },
  { nom: 'ETB — Destinées Radieuses Coffre Étincelant', setId: 'swsh4.5', serie: 'swsh' },
  { nom: 'ETB — Styles de combat',                setId: 'swsh5',   serie: 'swsh' },
  { nom: 'ETB — Règne de Glace',                  setId: 'swsh6',   serie: 'swsh' },
  { nom: 'ETB — Évolution Céleste',               setId: 'swsh7',   serie: 'swsh' },
  { nom: 'ETB — Poing de Fusion',                 setId: 'swsh8',   serie: 'swsh' },
  { nom: 'ETB — Stars Étincelantes',              setId: 'swsh9',   serie: 'swsh' },
  { nom: 'ETB — Astres Radieux',                  setId: 'swsh10',  serie: 'swsh' },
  { nom: 'ETB — Origine Perdue',                  setId: 'swsh11',  serie: 'swsh' },
  { nom: 'ETB — Tempête Argentée',                setId: 'swsh12',  serie: 'swsh' },
  { nom: 'ETB — Zénith Suprême',                  setId: 'swsh12.5',serie: 'swsh' },
  { nom: 'ETB — Voltage Éclatant',                setId: 'swsh4',   serie: 'swsh' },
  // Soleil et Lune (sm)
  { nom: 'ETB — Duo de Choc',                     setId: 'sm9',     serie: 'sm' },
  { nom: 'ETB — Alliance Infaillible',             setId: 'sm10',    serie: 'sm' },
  { nom: 'ETB — Harmonie des Esprits',             setId: 'sm11',    serie: 'sm' },
  { nom: 'ETB — Éclipse Cosmique',                setId: 'sm12',    serie: 'sm' },
  { nom: 'ETB — Lumière Interdite',               setId: 'sm6',     serie: 'sm' },
  { nom: 'ETB — Tempête Céleste',                 setId: 'sm7',     serie: 'sm' },
  { nom: 'ETB — Légendes Brillantes',             setId: 'sm3.5',   serie: 'sm' },
  { nom: 'ETB — Tonnerre Perdu',                  setId: 'sm8',     serie: 'sm' },
  { nom: 'ETB — Destinées Occultes',              setId: 'sm115',   serie: 'sm' },
  { nom: 'ETB — Ultra-Prisme',                    setId: 'sm5',     serie: 'sm' },
  // Méga-Évolution (me)
  { nom: 'ETB — Méga-Évolution',                  setId: 'me01',    serie: 'me' },
  // XY
  { nom: 'ETB — Héros Transcendants',             setId: 'xy11',    serie: 'xy' },
  { nom: 'ETB — Équilibre Parfait',               setId: 'xy10',    serie: 'xy' },
  { nom: 'ETB — Flammes Fantasmagoriques',        setId: 'xy9',     serie: 'xy' },
  { nom: 'ETB — Chaos Ascendant',                 setId: 'xy12',    serie: 'xy' },
]

async function run() {
  let updated = 0
  let notFound = []

  for (const entry of ETB_MAP) {
    const logoUrl = `https://assets.tcgdex.net/fr/${entry.serie}/${entry.setId}/logo`

    // Vérifier que le logo existe sur TCGdex
    const check = await fetch(logoUrl + '.webp', { method: 'HEAD' }).catch(() => null)
    if (!check || !check.ok) {
      console.log(`⚠️  Logo introuvable: ${entry.setId} → ${logoUrl}`)
      notFound.push(entry.nom)
      continue
    }

    const r = await pool.query(
      `UPDATE referentiel SET logo_url = $1 WHERE LOWER(nom) = LOWER($2) AND categorie = 'ETB' RETURNING id, nom`,
      [logoUrl, entry.nom]
    )

    if (r.rowCount > 0) {
      console.log(`✓ ${entry.nom} → ${entry.setId}`)
      updated++
    } else {
      console.log(`✗ Non trouvé en base: "${entry.nom}"`)
      notFound.push(entry.nom)
    }
  }

  console.log(`\n✅ ${updated} ETB mis à jour`)
  if (notFound.length > 0) {
    console.log(`⚠️  Non traités (${notFound.length}):`)
    notFound.forEach(n => console.log('  -', n))
  }

  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
