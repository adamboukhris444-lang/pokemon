// Migration idempotente : ajoute les colonnes de suivi de cote sur la table item.
// Lancer avec : npm run migrate
import { pool } from './db.js'

const statements = [
  `ALTER TABLE item ADD COLUMN IF NOT EXISTS cote_updated_at timestamptz`,
  `ALTER TABLE item ADD COLUMN IF NOT EXISTS cote_source varchar(40)`,
  `ALTER TABLE item ADD COLUMN IF NOT EXISTS cote_samples integer`,
]

try {
  for (const sql of statements) {
    await pool.query(sql)
    console.log('OK :', sql)
  }
  console.log('\nMigration terminée.')
} catch (err) {
  console.error('Échec de la migration :', err)
  process.exitCode = 1
} finally {
  await pool.end()
}
