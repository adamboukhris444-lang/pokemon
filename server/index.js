import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import { OAuth2Client } from 'google-auth-library'
import { pool } from './db.js'
import { runReferentielSearch } from './hermes-agent.js'
import { hashPassword, checkPassword, signToken, authMiddleware } from './auth.js'

const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const app = express()
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

// Proxy d'images — évite les blocages navigateur sur les CDN externes
const ALLOWED_IMG_HOSTS = ['assets.tcgdex.net', 'assets.pokemon.com', 'www.pokepedia.fr', 'raw.githubusercontent.com', 'images.pokemontcg.io']
app.get('/api/img', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).end()
  try {
    const host = new URL(url).hostname
    if (!ALLOWED_IMG_HOSTS.some(h => host === h)) return res.status(403).end()
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!upstream.ok) return res.status(upstream.status).end()
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/png')
    res.set('Cache-Control', 'public, max-age=86400')
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.send(buf)
  } catch {
    res.status(502).end()
  }
})

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key varchar(100) PRIMARY KEY,
      value text
    );
    CREATE TABLE IF NOT EXISTS referentiel (
      id serial PRIMARY KEY,
      nom varchar(255) NOT NULL UNIQUE,
      reference varchar(100),
      categorie varchar(100),
      source varchar(50) DEFAULT 'hermes-agent',
      origine varchar(255),
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE referentiel ADD COLUMN IF NOT EXISTS origine varchar(255);
    ALTER TABLE IF EXISTS carte ADD COLUMN IF NOT EXISTS source varchar(50);
    ALTER TABLE IF EXISTS carte ADD COLUMN IF NOT EXISTS origine varchar(255);
    ALTER TABLE IF EXISTS carte ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  `)
}

ensureTables().catch(console.error)

async function fetchFrenchName(speciesUrl) {
  try {
    const r = await fetch(speciesUrl)
    const species = await r.json()
    const frName = species.names.find((n) => n.language.name === 'fr')?.name
    return frName || null
  } catch {
    return null
  }
}

async function fetchFromPokeApi(limit) {
  const listRes = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`)
  const listData = await listRes.json()

  const batchSize = 100
  const details = []
  for (let i = 0; i < listData.results.length; i += batchSize) {
    const batch = listData.results.slice(i, i + batchSize)
    const batchDetails = await Promise.all(batch.map((p) => fetch(p.url).then((r) => r.json())))
    const namesFr = await Promise.all(batchDetails.map((d) => fetchFrenchName(d.species.url)))
    batchDetails.forEach((d, idx) => { d._nameFr = namesFr[idx] })
    details.push(...batchDetails)
  }

  return details.map((d) => ({
    id: d.id,
    name: d.name,
    name_fr: d._nameFr,
    sprite: d.id <= 1025
      ? `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${String(d.id).padStart(3, '0')}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${d.id}.png`,
    types: d.types.map((t) => t.type.name),
    stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
  }))
}

async function savePokemon(pokemon) {
  await pool.query(
    `INSERT INTO pokemon (id, name, name_fr, sprite, types, stats, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (id) DO UPDATE
     SET name = $2, name_fr = $3, sprite = $4, types = $5, stats = $6, updated_at = now()`,
    [pokemon.id, pokemon.name, pokemon.name_fr, pokemon.sprite, JSON.stringify(pokemon.types), JSON.stringify(pokemon.stats)]
  )
}

app.get('/api/pokemon', async (req, res) => {
  const limit = Number(req.query.limit) || 60

  try {
    const cached = await pool.query('SELECT * FROM pokemon ORDER BY id ASC LIMIT $1', [limit])
    if (cached.rows.length >= limit) {
      return res.json(cached.rows)
    }

    const fresh = await fetchFromPokeApi(limit)
    await Promise.all(fresh.map(savePokemon))
    res.json(fresh)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer les Pokémon.' })
  }
})

let setsCache = null
let setsCacheAt = 0
const SETS_CACHE_KEY = 'tcgdex_sets_map'
const ONE_DAY = 24 * 60 * 60 * 1000

async function getTcgdexSetsMap() {
  if (setsCache && Date.now() - setsCacheAt < ONE_DAY) return setsCache

  // Essayer de charger depuis la DB d'abord
  try {
    const row = await pool.query('SELECT value, updated_at FROM settings WHERE key = $1', [SETS_CACHE_KEY])
    if (row.rows.length > 0) {
      const age = Date.now() - new Date(row.rows[0].updated_at).getTime()
      if (age < ONE_DAY) {
        setsCache = JSON.parse(row.rows[0].value)
        setsCacheAt = Date.now() - age
        return setsCache
      }
    }
  } catch {}

  // Reconstruction depuis TCGdex
  const listRes = await fetch('https://api.tcgdex.net/v2/fr/sets')
  const sets = await listRes.json()

  const map = {}
  const batchSize = 30
  for (let i = 0; i < sets.length; i += batchSize) {
    const batch = sets.slice(i, i + batchSize)
    const details = await Promise.all(
      batch.map((s) => fetch(`https://api.tcgdex.net/v2/fr/sets/${s.id}`).then((r) => r.json()).catch(() => null))
    )
    details.forEach((d, idx) => {
      if (!d) return
      map[batch[idx].id] = { name: d.name, releaseDate: d.releaseDate, series: d.serie?.name || null, seriesId: d.serie?.id || null }
    })
  }

  setsCache = map
  setsCacheAt = Date.now()

  // Persister en DB pour les prochains redémarrages
  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [SETS_CACHE_KEY, JSON.stringify(map)]
    )
  } catch {}

  return map
}

function proxyImg(url) {
  if (!url) return url
  // Déjà proxifié
  if (url.includes('localhost:3001/api/img')) return url
  return `http://localhost:3001/api/img?url=${encodeURIComponent(url)}`
}

function cardRowToApi(row) {
  const raw = row.image
  const low = raw.includes('/high.png') ? raw.replace('/high.png', '/low.png') : raw
  const high = raw.includes('/low.png') ? raw.replace('/low.png', '/high.png') : raw.replace('/high.png', '/high.png') || raw
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    image: proxyImg(low),
    imageHigh: proxyImg(high),
    setName: row.set_name,
    setSeries: row.set_series,
    seriesId: row.series_id,
    releaseDate: row.release_date,
    edition: row.edition,
    hasFirstEdition: row.has_first_edition,
  }
}

async function saveCards(pokemonId, cards) {
  await pool.query('DELETE FROM carte WHERE pokemon_id = $1', [pokemonId])
  for (const c of cards) {
    await pool.query(
      `INSERT INTO carte (id, pokemon_id, name, number, image, set_name, set_series, series_id, release_date, edition, has_first_edition, source, origine)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'tcgdex-api', 'tcgdex.dev')
       ON CONFLICT (id) DO UPDATE
       SET name = $3, number = $4, image = $5, set_name = $6, set_series = $7, series_id = $8, release_date = $9, edition = $10, has_first_edition = $11, updated_at = now(), source = 'tcgdex-api', origine = 'tcgdex.dev'`,
      [c.id, pokemonId, c.name, c.number, c.image, c.setName, c.setSeries, c.seriesId, c.releaseDate, c.edition, c.hasFirstEdition || false]
    )
  }
}

app.get('/api/pokemon/:id/cards', async (req, res) => {
  const id = Number(req.params.id)
  const forceRefresh = req.query.refresh === '1'

  try {
    // Cache de 7 jours — les promos ajoutées à TCGdex après le premier chargement seront récupérées
    if (!forceRefresh) {
      const cached = await pool.query(
        `SELECT * FROM carte WHERE pokemon_id = $1
         AND (updated_at IS NULL OR updated_at > now() - interval '7 days')
         ORDER BY release_date ASC`,
        [id]
      )
      if (cached.rows.length > 0) return res.json(cached.rows.map(cardRowToApi))
    }

    // Nom français du Pokémon pour la recherche complémentaire par nom (promos)
    const pkRow = await pool.query('SELECT name_fr FROM pokemon WHERE id = $1', [id])
    const nameFr = pkRow.rows[0]?.name_fr

    const [listRes, setsMap] = await Promise.all([
      fetch(`https://api.tcgdex.net/v2/fr/cards?dexId=eq:${id}`),
      getTcgdexSetsMap(),
    ])
    if (!listRes.ok) throw new Error('TCGdex request failed')
    let list = await listRes.json()

    // Recherche complémentaire par nom français — capture Tag Teams, Escouades, promos non indexées par dexId
    if (nameFr) {
      try {
        const nameRes = await fetch(`https://api.tcgdex.net/v2/fr/cards?name=like:${encodeURIComponent(nameFr)}`)
        if (nameRes.ok) {
          const nameList = await nameRes.json()
          const seen = new Set(list.map((c) => c.id))
          // Inclure les cartes sans image si elles sont dans smp (fallback pokemontcg.io disponible)
          const extras = (Array.isArray(nameList) ? nameList : []).filter((c) => {
            if (seen.has(c.id)) return false
            if (c.image) return true
            const setId = c.id.split('-')[0]
            return setId === 'smp'
          })
          if (extras.length > 0) list = [...list, ...extras]
        }
      } catch {}
    }

    const BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001'

    function toCard(c) {
      const setId = c.id.slice(0, c.id.length - c.localId.length - 1)
      const setInfo = setsMap[setId] || {}
      // Fallback pokemontcg.io pour les sets sans images TCGdex (ex: smp)
      const imgBase = c.image
        || (setId === 'smp' ? `https://images.pokemontcg.io/smp/${c.localId}` : null)
      if (!imgBase) return null
      return {
        id: c.id,
        name: c.name,
        number: c.localId,
        image: `${BASE_URL}/api/img?url=${encodeURIComponent(imgBase + (c.image ? '/low.png' : '.png'))}`,
        imageHigh: `${BASE_URL}/api/img?url=${encodeURIComponent(imgBase + (c.image ? '/high.png' : '_hires.png'))}`,
        setName: setInfo.name || setId,
        setSeries: setInfo.series || null,
        seriesId: setInfo.seriesId || null,
        releaseDate: setInfo.releaseDate || null,
      }
    }

    let cards = list
      .filter((c) => c.image || c.id.split('-')[0] === 'smp')
      .map(toCard)
      .filter(Boolean)
      .filter((c) => c.seriesId !== 'tcgp')
      .sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999'))
      .map((c) => ({ ...c, edition: null }))

    // 1ère Édition — uniquement pour les séries Wizards / Neo
    const FIRST_EDITION_SERIES = ['base', 'neo']
    const candidates = cards.filter((c) => FIRST_EDITION_SERIES.includes(c.seriesId))
    if (candidates.length > 0) {
      const details = await Promise.all(
        candidates.map((c) => fetch(`https://api.tcgdex.net/v2/fr/cards/${c.id}`).then((r) => r.json()).catch(() => null))
      )
      const firstEdMap = {}
      details.forEach((d, idx) => { if (d) firstEdMap[candidates[idx].id] = !!d.variants?.firstEdition })
      cards = cards.map((c) => ({ ...c, hasFirstEdition: firstEdMap[c.id] || false }))
    }

    await saveCards(id, cards)
    res.json(cards)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer les cartes.' })
  }
})

app.get('/api/items', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM item WHERE user_id = $1 AND nom IS NOT NULL ORDER BY id ASC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer les items.' })
  }
})

app.patch('/api/items/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  const { cote_actuelle, quantite, image, etat, set_extension, numero_carte } = req.body

  if ([cote_actuelle, quantite, image, etat, set_extension, numero_carte].every((v) => v === undefined)) {
    return res.status(400).json({ error: 'Au moins un champ est obligatoire.' })
  }

  try {
    let result
    if (cote_actuelle !== undefined) {
      result = await pool.query(
        `UPDATE item SET cote_actuelle = $1, cote_updated_at = now(), cote_source = 'manuel'
         WHERE id = $2 RETURNING *`,
        [cote_actuelle, id]
      )
    } else if (quantite !== undefined) {
      result = await pool.query(`UPDATE item SET quantite = $1 WHERE id = $2 RETURNING *`, [quantite, id])
    } else if (image !== undefined) {
      result = await pool.query(`UPDATE item SET image = $1 WHERE id = $2 RETURNING *`, [image, id])
    } else if (etat !== undefined) {
      result = await pool.query(`UPDATE item SET etat = $1 WHERE id = $2 RETURNING *`, [etat, id])
    } else if (set_extension !== undefined) {
      result = await pool.query(`UPDATE item SET set_extension = $1 WHERE id = $2 RETURNING *`, [set_extension, id])
    } else {
      result = await pool.query(`UPDATE item SET numero_carte = $1 WHERE id = $2 RETURNING *`, [numero_carte, id])
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item introuvable.' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de mettre à jour la cote.' })
  }
})

app.post('/api/items', authMiddleware, async (req, res) => {
  const { nom, prix_achat, cote_actuelle, image, quantite, type, etat, set_extension, numero_carte } = req.body

  if (!nom || prix_achat === undefined || prix_achat === null) {
    return res.status(400).json({ error: 'Le nom et le prix d\'achat sont obligatoires.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO item (user_id, nom, prix_achat, cote_actuelle, image, quantite, type, etat, set_extension, numero_carte)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id, nom, prix_achat, cote_actuelle ?? prix_achat, image ?? null, quantite ?? 1,
        type === 'carte' ? 'carte' : 'scelle',
        etat || null, set_extension || null, numero_carte || null,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible d\'enregistrer l\'achat.' })
  }
})

app.get('/api/extensions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, b.ordre AS bloc_ordre FROM extension e
       LEFT JOIN bloc b ON b.id = e.bloc_id
       ORDER BY COALESCE(b.ordre, 99) ASC, e.ordre ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer les extensions.' })
  }
})

app.get('/api/societes-gradation', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM societe_gradation ORDER BY nom ASC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer les sociétés de gradation.' })
  }
})

app.get('/api/catalogue', async (req, res) => {
  const { categorie } = req.query
  try {
    const cats = categorie ? [categorie] : ['ETB', 'Display']
    const result = await pool.query(
      `SELECT * FROM referentiel WHERE categorie = ANY($1) ORDER BY date_sortie DESC NULLS LAST, nom ASC`,
      [cats]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer le catalogue.' })
  }
})

app.post('/api/catalogue/find-images', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configuré.' })
  const { categorie = 'ETB' } = req.body
  req.setTimeout(600000)
  try {
    const produits = await pool.query(
      `SELECT id, nom FROM referentiel WHERE categorie = $1 ORDER BY date_sortie DESC`,
      [categorie]
    )
    const liste = produits.rows.map(p => `- ${p.nom}`).join('\n')
    const query = `Trouve les images officielles des boîtes produit Pokemon TCG ${categorie} — validation obligatoire sur 3 sources (cardmarket.com/fr, pokemon.com/fr, bulbapedia.bulbagarden.net) avant d'inclure chaque produit.\n\nListe des produits à illustrer :\n${liste}`
    const result = await runReferentielSearch(query)

    let updated = 0
    for (const item of (result.added || [])) {
      if (!item.image_url || !item.nom) continue
      const match = produits.rows.find(p => p.nom.toLowerCase().includes(item.nom.toLowerCase().replace(/etb — |display — /i, '')))
      if (match) {
        await pool.query(`UPDATE referentiel SET image_url = $1 WHERE id = $2`, [item.image_url, match.id])
        updated++
      }
    }
    res.json({ updated, raw: result })
  } catch (err) {
    console.error('[find-images]', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/catalogue/enrich', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configuré.' })
  const { era = 'toutes les ères depuis 1999' } = req.body
  req.setTimeout(600000)
  const query = `ETB Elite Trainer Box et Display booster box Pokémon TCG ${era} France`
  try {
    const result = await runReferentielSearch(query)
    res.json(result)
  } catch (err) {
    console.error('[Catalogue enrich]', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/referentiel', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referentiel ORDER BY categorie, nom')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/referentiel/enrich', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configuré dans .env' })
  }
  const { query = 'produits Pokemon TCG disponibles en France 2024 2025 coffrets boosters ETB display tin' } = req.body
  req.setTimeout(600000)
  try {
    const result = await runReferentielSearch(query)
    res.json(result)
  } catch (err) {
    console.error('[Hermes] Erreur:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { email, password, pseudo } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe obligatoires.' })
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min).' })
  try {
    const hash = await hashPassword(password)
    const result = await pool.query(
      'INSERT INTO user_account (email, password_hash, pseudo) VALUES ($1, $2, $3) RETURNING id, email, pseudo',
      [email.toLowerCase().trim(), hash, pseudo || null]
    )
    const user = result.rows[0]
    const token = signToken({ id: user.id, email: user.email })
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 })
    res.status(201).json({ user, token })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    console.error(err)
    res.status(500).json({ error: 'Erreur lors de l\'inscription.' })
  }
})

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body
  if (!credential) return res.status(400).json({ error: 'Token Google manquant.' })
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID non configuré.' })
  try {
    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    const email = payload.email.toLowerCase()
    const name = payload.name || payload.given_name || email.split('@')[0]

    let result = await pool.query('SELECT id, email, pseudo FROM user_account WHERE email = $1', [email])
    let user = result.rows[0]
    if (!user) {
      result = await pool.query(
        'INSERT INTO user_account (email, pseudo) VALUES ($1, $2) RETURNING id, email, pseudo',
        [email, name]
      )
      user = result.rows[0]
    }

    const token = signToken({ id: user.id, email: user.email })
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 })
    res.json({ user, token })
  } catch (err) {
    console.error('[Google Auth]', err.message)
    res.status(401).json({ error: 'Token Google invalide.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe obligatoires.' })
  try {
    const result = await pool.query('SELECT * FROM user_account WHERE email = $1', [email.toLowerCase().trim()])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    if (!user.password_hash) return res.status(400).json({ error: 'Ce compte utilise la connexion Google.' })
    if (!(await checkPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }
    const token = signToken({ id: user.id, email: user.email })
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 })
    res.json({ user: { id: user.id, email: user.email, pseudo: user.pseudo }, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur lors de la connexion.' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT id, email, pseudo, created_at FROM user_account WHERE id = $1', [req.user.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' })
  res.json(result.rows[0])
})

// ─── ANNONCES ────────────────────────────────────────────────────────────────

app.get('/api/annonces', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.pseudo, u.email
       FROM annonce a JOIN user_account u ON u.id = a.user_id
       WHERE a.statut = 'active'
       ORDER BY a.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de récupérer les annonces.' })
  }
})

app.get('/api/annonces/mes', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM annonce WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Impossible de récupérer vos annonces.' })
  }
})

app.post('/api/annonces', authMiddleware, async (req, res) => {
  const { nom, categorie, etat, set_extension, numero_carte, prix, description, image_url } = req.body
  if (!nom || !prix) return res.status(400).json({ error: 'Nom et prix obligatoires.' })
  try {
    const result = await pool.query(
      `INSERT INTO annonce (user_id, nom, categorie, etat, set_extension, numero_carte, prix, description, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, nom, categorie || null, etat || null, set_extension || null, numero_carte || null, prix, description || null, image_url || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de publier l\'annonce.' })
  }
})

app.patch('/api/annonces/:id', authMiddleware, async (req, res) => {
  const { statut } = req.body
  try {
    const result = await pool.query(
      'UPDATE annonce SET statut = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [statut, req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Annonce introuvable.' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Impossible de modifier l\'annonce.' })
  }
})

app.delete('/api/annonces/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM annonce WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Annonce introuvable.' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Impossible de supprimer l\'annonce.' })
  }
})

app.delete('/api/items/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM item WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Item introuvable.' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Impossible de supprimer l\'item.' })
  }
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`API démarrée sur http://localhost:${port}`))
