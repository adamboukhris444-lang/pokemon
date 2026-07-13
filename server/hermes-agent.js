import { spawn } from 'child_process'
import { pool } from './db.js'

const SSH_HOST = process.env.HERMES_SSH_HOST
const SSH_USER = process.env.HERMES_SSH_USER || 'hermes'
const SSH_KEY  = process.env.HERMES_SSH_KEY_PATH
const SSH_BIN  = process.env.HERMES_SSH_BIN || '/home/hermes/.local/bin/hermes'

function runHermesCLI(prompt, timeoutMs = 480000) {
  return new Promise((resolve, reject) => {
    if (!SSH_HOST || !SSH_KEY) {
      return reject(new Error('HERMES_SSH_HOST et HERMES_SSH_KEY_PATH sont requis dans .env'))
    }

    // Encode le prompt en base64 pour éviter tout problème de quotes/escaping
    const b64 = Buffer.from(prompt).toString('base64')

    // Script bash distant : python3 décode le b64 → fichier temp, hermes -z avec provider nous
    const remoteScript = `python3 -c "import base64; open('/tmp/hermes_q.txt','w').write(base64.b64decode('${b64}').decode())" && ${SSH_BIN} --cli --yolo --provider nous -z "$(cat /tmp/hermes_q.txt)"; rm -f /tmp/hermes_q.txt`

    const child = spawn('ssh', [
      '-i', SSH_KEY,
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-o', 'ConnectTimeout=15',
      `${SSH_USER}@${SSH_HOST}`,
      remoteScript,
    ])

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', d => {
      const chunk = d.toString()
      process.stdout.write('[Hermes] ' + chunk.slice(0, 120))
      stdout += chunk
    })
    child.stderr.on('data', d => { stderr += d.toString() })

    const timer = setTimeout(() => {
      console.log('[Hermes] Timeout — on récupère ce qu\'on a')
      child.kill()
      resolve(stdout)
    }, timeoutMs)

    child.on('close', code => {
      clearTimeout(timer)
      console.log(`\n[Hermes CLI] Terminé (code ${code}), longueur: ${stdout.length}`)
      if (stderr) console.log('[Hermes stderr]', stderr.slice(0, 300))
      resolve(stdout)
    })

    child.on('error', err => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function buildPrompt(query) {
  return `${query}

Tu as accès à bash (curl, etc.). Ta mission : dresser un référentiel fiable des ETB et Displays Pokémon TCG vendus en France.

## Règle de validation OBLIGATOIRE
Un produit ne peut être inclus dans le résultat final QUE s'il est confirmé par les 3 sources suivantes. Si une source ne le mentionne pas, le produit est exclu.

## Sources à consulter (dans cet ordre)

SOURCE 1 — Cardmarket (marché EU)
  curl "https://www.cardmarket.com/fr/Pokemon/Products/Sealed-Products?searchString=elite+trainer+box"
  curl "https://www.cardmarket.com/fr/Pokemon/Products/Sealed-Products?searchString=display+booster"
  → Extrais : nom du produit, URL image produit (.jpg/.png directe)

SOURCE 2 — Site officiel Pokémon France
  curl "https://www.pokemon.com/fr/jeux-de-cartes-pokemon/acheter/produits"
  → Confirme l'existence officielle en France + récupère image si disponible

SOURCE 3 — Bulbapedia (référence encyclopédique)
  curl "https://bulbapedia.bulbagarden.net/wiki/Elite_Trainer_Box"
  curl "https://bulbapedia.bulbagarden.net/wiki/Booster_box"
  → Confirme nom officiel + année de sortie

## Procédure
1. Collecte la liste complète depuis SOURCE 1 (Cardmarket)
2. Pour chaque produit de SOURCE 1, vérifie sa présence sur SOURCE 2 et SOURCE 3
3. Ne conserve QUE les produits confirmés sur les 3 sources
4. Pour l'image officielle : préfère SOURCE 1 (Cardmarket) ou SOURCE 2 (pokemon.com)

## Format de sortie
À la fin, réponds UNIQUEMENT avec un tableau JSON valide (sans texte autour) :
[{"nom":"...","reference":null,"categorie":"ETB ou Display","annee":2024,"image_url":"https://...","sources":["cardmarket","pokemon.com","bulbapedia"]}]

- "nom" : nom officiel français (ex: "ETB — Écarlate et Violet")
- "categorie" : uniquement "ETB" ou "Display"
- "annee" : année de sortie en France (entier)
- "image_url" : URL directe image boîte produit (.jpg/.png) — null si introuvable
- "sources" : liste des 3 sources qui confirment ce produit
- Ne jamais inventer une image_url
- N'inclure QUE les produits validés par les 3 sources`
}

function extractJsonItems(text) {
  // Markdown code block ```json [...]```
  const codeBlock = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
  if (codeBlock) {
    try {
      const arr = JSON.parse(codeBlock[1])
      if (Array.isArray(arr) && arr.length > 0 && arr[0]?.nom) return arr
    } catch {}
  }

  // Tous les tableaux JSON — retourne le plus grand avec un champ "nom"
  const candidates = []
  const regex = /\[[\s\S]*?\]/g
  let m
  while ((m = regex.exec(text)) !== null) {
    try {
      const arr = JSON.parse(m[0])
      if (Array.isArray(arr) && arr.length > 0 && arr[0]?.nom) candidates.push(arr)
    } catch {}
  }
  if (candidates.length > 0) return candidates.sort((a, b) => b.length - a.length)[0]

  return []
}

export async function runReferentielSearch(query) {
  const prompt = buildPrompt(query)

  console.log('[Hermes] Lancement via SSH CLI...')
  const fullText = await runHermesCLI(prompt)
  console.log('[Hermes] Réponse reçue, longueur:', fullText.length)
  console.log('[Hermes] Fin du texte:', fullText.slice(-300))

  const items = extractJsonItems(fullText)
  console.log('[Hermes] Items trouvés:', items.length)

  const added = []
  const skipped = []

  for (const item of items) {
    if (!item.nom || !item.categorie) continue
    try {
      const r = await pool.query(
        `INSERT INTO referentiel (nom, reference, categorie, source, annee, image_url)
         VALUES ($1, $2, $3, 'hermes-ssh', $4, $5)
         ON CONFLICT (nom) DO UPDATE SET
           annee      = COALESCE(EXCLUDED.annee,      referentiel.annee),
           image_url  = COALESCE(EXCLUDED.image_url,  referentiel.image_url),
           source     = 'hermes-ssh'
         RETURNING *`,
        [item.nom.trim(), item.reference || null, item.categorie, item.annee || null, item.image_url || null]
      )
      if (r.rows.length > 0) added.push(r.rows[0])
      else skipped.push(item.nom)
    } catch (err) {
      console.error('[Hermes] DB erreur:', err.message)
    }
  }

  console.log(`[Hermes] Terminé — ${added.length} ajoutés/mis à jour, ${skipped.length} ignorés`)
  return { added, skipped }
}
