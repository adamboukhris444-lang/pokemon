CREATE TABLE IF NOT EXISTS user_account (
  id serial PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  pseudo varchar(50),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annonce (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  nom varchar(255) NOT NULL,
  categorie varchar(50),
  etat varchar(50),
  set_extension varchar(150),
  numero_carte varchar(20),
  prix numeric(10,2) NOT NULL,
  description text,
  image_url varchar(500),
  statut varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annonce_user_id ON annonce(user_id);
CREATE INDEX IF NOT EXISTS idx_annonce_statut ON annonce(statut);
