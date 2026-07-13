# Mise à jour automatique des prix avec Hermes Agent

Ce dossier contient le système de mise à jour de la cote de votre collection.
Il est conçu pour être lancé périodiquement par **Hermes Agent** (Hostinger VPS).

## Architecture

```
Hermes Agent (cron 1x/jour)
   └─> node server/update-prices.js
          ├─ eBay        : API officielle (gratuite)
          ├─ Cardmarket  : API officielle (compte vendeur)
          └─ Vinted      : scraping via proxy Oxylabs
       puis UPDATE item SET cote_actuelle, cote_source, cote_samples, cote_updated_at
```

La première source (dans l'ordre eBay → Cardmarket → Vinted) qui renvoie un prix
l'emporte. Chaque source s'active automatiquement dès que ses clés sont dans `.env`.

## 1. Préparer la base

```bash
npm run migrate          # ajoute cote_updated_at, cote_source, cote_samples
```

## 2. Configurer les sources (.env)

Copiez `.env.example` vers `.env` et renseignez au moins eBay :

- **eBay** (gratuit) : créez une app sur https://developer.ebay.com,
  récupérez App ID + Cert ID → `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`.
- **Cardmarket** (compte vendeur) : Account > API → 4 clés `CM_*`.
- **Vinted** : `VINTED_ENABLED=true` + idéalement les identifiants Oxylabs
  (fournis avec Hermes) dans `OXYLABS_USERNAME` / `OXYLABS_PASSWORD`.

## 3. Tester en local

```bash
npm run update-prices -- --dry-run          # n'écrit rien
npm run update-prices -- --source ebay      # une seule source
npm run update-prices -- --id 2             # un seul item
npm run update-prices                       # exécution réelle
```

## 4. Brancher Hermes Agent

Hermes dispose d'un **cron natif** et peut exécuter des commandes terminal.
Deux options :

### Option A — Cron déterministe (recommandé)
Dans la CLI Hermes, demandez-lui de créer une tâche planifiée qui exécute :

```
cd /chemin/vers/pokemon && node server/update-prices.js
```

tous les jours (ex. 6h du matin). C'est fiable et reproductible.

### Option B — Tâche en langage naturel
Vous pouvez aussi confier la recherche à l'agent lui-même (il utilise son
scraping Oxylabs + browser intégrés), par ex. :

> « Chaque matin, pour chaque ligne de la table `item` de ma base PostgreSQL
>   `pokemon`, cherche le prix moyen sur eBay et Vinted, puis mets à jour
>   `cote_actuelle`, `cote_source` et `cote_updated_at`. »

Moins déterministe mais ne nécessite pas les clés API eBay.

## Notes

- eBay Browse API renvoie des **annonces actives** (pas les ventes conclues) ;
  on prend la **médiane** pour lisser les extrêmes.
- Pour les **ventes réellement conclues** sur eBay, il faut l'accès
  *Marketplace Insights API* (demande séparée auprès d'eBay).
