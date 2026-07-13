import { NodeSSH } from 'node-ssh'
import { pool } from './db.js'

const HOST = process.env.HERMES_SSH_HOST
const USER = process.env.HERMES_SSH_USER || 'hermes'
const KEY_PATH = process.env.HERMES_SSH_KEY_PATH
const HERMES_BIN = process.env.HERMES_SSH_BIN || '/home/hermes/.local/bin/hermes'

function escapeShellArg(arg) {
  return `'${arg.replace(/'/g, "'\\''")}'`
}

async function runOneshot(prompt, { timeoutMs = 180000 } = {}) {
  if (!HOST || !KEY_PATH) throw new Error('HERMES_SSH_HOST et HERMES_SSH_KEY_PATH sont requis dans .env')

  const ssh = new NodeSSH()
  await ssh.connect({ host: HOST, username: USER, privateKeyPath: KEY_PATH, readyTimeout: 15000 })

  // `timeout` côté shell distant tue le process hermes s'il se bloque (ex: outil web qui hang
  // en attente d'une approbation sans TTY) — évite un blocage indéfini de la connexion SSH.
  const timeoutSec = Math.floor(timeoutMs / 1000)
  try {
    const result = await ssh.execCommand(
      `timeout -k 5 ${timeoutSec} ${HERMES_BIN} -z ${escapeShellArg(prompt)} --yolo`,
      { execOptions: {} }
    )
    if (result.code === 124) {
      throw new Error(`hermes a dépassé le délai de ${timeoutSec}s (probablement bloqué sur un outil)`)
    }
    if (result.code !== 0 && !result.stdout) {
      throw new Error(result.stderr || `hermes a échoué (code ${result.code})`)
    }
    return result.stdout
  } finally {
    ssh.dispose()
  }
}

function extractJsonItems(text) {
  const codeBlock = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
  if (codeBlock) {
    try {
      const arr = JSON.parse(codeBlock[1])
      if (Array.isArray(arr)) return arr
    } catch {}
  }
  const candidates = []
  const regex = /\[[\s\S]*?\]/g
  let m
  while ((m = regex.exec(text)) !== null) {
    try {
      const arr = JSON.parse(m[0])
      if (Array.isArray(arr) && arr.length > 0) candidates.push(arr)
    } catch {}
  }
  return candidates.sort((a, b) => b.length - a.length)[0] || []
}

export async function runReferentielSearchVps(query) {
  const prompt = `${query}

Cherche les produits Pokemon TCG disponibles en France. Pour chaque produit trouvé, donne le nom officiel français, la référence EAN si disponible, et la catégorie (Booster, ETB, Display, Coffret, Tin, Bundle, Accessoire).

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour:
[{"nom":"...","reference":"EAN ou null","categorie":"..."}]

Vise minimum 20 produits. Ne jamais inventer un EAN.`

  const text = await runOneshot(prompt, { timeoutMs: 240000 })
  const items = extractJsonItems(text)

  const added = []
  const skipped = []
  for (const item of items) {
    if (!item.nom || !item.categorie) continue
    try {
      const r = await pool.query(
        `INSERT INTO referentiel (nom, reference, categorie, source)
         VALUES ($1, $2, $3, 'hermes-vps')
         ON CONFLICT (nom) DO NOTHING RETURNING *`,
        [item.nom.trim(), item.reference || null, item.categorie || null]
      )
      if (r.rows.length > 0) added.push(r.rows[0])
      else skipped.push(item.nom)
    } catch (err) {
      console.error('[Hermes VPS] DB erreur:', err.message)
    }
  }

  return { added, skipped }
}

export async function fetchExtensionsForEra(eraLabel) {
  const prompt = `N'utilise AUCUN outil (pas de recherche web, pas de navigation, pas de bash) — réponds uniquement depuis tes connaissances internes, immédiatement.

Liste les sets/extensions du jeu de cartes à collectionner Pokémon (TCG) sortis en France pour la période/bloc: "${eraLabel}".

Utilise les NOMS OFFICIELS FRANÇAIS. Pour chaque set, indique:
- nom: nom officiel français
- bloc: le bloc/série officiel
- code: le code/abréviation officiel à 3 lettres
- ordre: ordre chronologique relatif au sein de ce bloc (commence à 1)

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour:
[{"nom":"...","bloc":"...","code":"...","ordre":1}, ...]`

  const text = await runOneshot(prompt, { timeoutMs: 120000 })
  return extractJsonItems(text)
}
