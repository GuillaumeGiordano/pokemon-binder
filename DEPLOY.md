# Déploiement — Pokémon Binder

> **Cible** : `https://pokemon.g2webdev.fr` · VPS Infomaniak (`179.237.68.75`, Debian 13)
> · PM2 (nom `pokemon-binder`, port **3040**) derrière Nginx · PostgreSQL du VPS.
> Procédure générale du VPS : `Projects_G2_Webdev/deploiement-vps.md`.

---

## 0. Avant le VPS (sur ton PC et dans les consoles)

1. **GitHub** : créer le dépôt `GuillaumeGiordano/pokemon-binder`, puis pousser :
   ```bash
   git remote add origin git@github.com:GuillaumeGiordano/pokemon-binder.git
   git push -u origin main
   ```
2. **DNS** (chez le registrar de `g2webdev.fr`) : un enregistrement **A** `pokemon` → `179.237.68.75`.
3. **G2 Hub de production** (`https://hub.g2webdev.fr`, connexion superadmin + 2FA) :
   - créer l'application **« Pokémon Binder »** (offre **Auth**) ;
   - URL de retour **exacte** : `https://pokemon.g2webdev.fr/auth/callback` ;
   - noter le **client id** et le **client secret** (le secret n'est affiché qu'une fois) ;
   - inviter ton adresse e-mail comme utilisateur de l'application (D9) et choisir ton mot de passe.

---

## 1. Vérifications sur le VPS

```bash
ssh -i C:\Users\guigo\.ssh\id_ed25519 -p 2222 debian@179.237.68.75
```

```bash
node -v                                   # 22 ou plus (le .env est chargé par --env-file)
sudo ss -tlnp | grep -E ':3040\b' || echo "port 3040 libre"   # une ligne affichée = port PRIS (3030 l'était par g2-erp)
systemctl is-active postgresql            # « active » : PostgreSQL est déjà installé
free -h                                   # le build demande de la mémoire (swap de 1 Go prévu)
```

- **Port 3040 occupé** → choisir un autre port et le reporter dans `.env` (`PORT`) et dans Nginx.
- **PostgreSQL absent** → `sudo apt install -y postgresql`.

---

## 2. Base de données

Générer un mot de passe **sur le VPS** (il ne quitte pas le serveur) :

```bash
DB_PASSWORD=$(openssl rand -hex 24); echo "$DB_PASSWORD"   # à copier dans DATABASE_URL (étape 3)
sudo -u postgres psql -c "CREATE USER pokemonbinder WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE pokemonbinder OWNER pokemonbinder;"
```

---

## 3. Code et configuration

```bash
cd /home/debian
git clone git@github.com:GuillaumeGiordano/pokemon-binder.git
cd pokemon-binder
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # nouveau SESSION_SECRET
nano .env
```

Valeurs de production dans `.env` :

```bash
DATABASE_URL="postgresql://pokemonbinder:<DB_PASSWORD>@127.0.0.1:5432/pokemonbinder?schema=public"
HUB_URL="https://hub.g2webdev.fr"
POKEMON_BINDER_URL="https://pokemon.g2webdev.fr"
POKEMON_BINDER_CLIENT_ID="<client id du hub>"
POKEMON_BINDER_CLIENT_SECRET="<client secret du hub>"
SESSION_SECRET="<valeur générée ci-dessus>"
PRICE_JOB_ENABLED="true"
ORIGIN="https://pokemon.g2webdev.fr"
HOST="127.0.0.1"
PORT="3040"
```

```bash
chmod 600 .env
```

---

## 4. Premier déploiement

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Le script : `pnpm install` → `prisma generate` + `db push` (crée les tables) → build → démarrage PM2
→ vérifie que l'app répond **303** (redirection vers `/connexion`).

En cas d'échec : `pm2 logs pokemon-binder --lines 50 --nostream`.

---

## 5. Nginx

```bash
sudo nano /etc/nginx/sites-available/pokemon-binder
```

```nginx
server {
    listen 80;
    server_name pokemon.g2webdev.fr;

    location / {
        proxy_pass http://127.0.0.1:3040;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pokemon-binder /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. HTTPS

Vérifier d'abord la propagation DNS (doit afficher `179.237.68.75`) :

```bash
curl -s "https://dns.google/resolve?name=pokemon.g2webdev.fr&type=A"
sudo certbot --nginx -d pokemon.g2webdev.fr
```

---

## 7. Vérifier

1. `https://pokemon.g2webdev.fr` → page « Se connecter avec G2 Hub ».
2. Connexion → retour sur l'app, création d'un profil, recherche d'une carte.
3. **Sur le téléphone** : « Scanner » → photo d'une carte entière → numéro lu.

---

## Mettre à jour

```bash
cd /home/debian/pokemon-binder && git pull && ./scripts/deploy.sh
```
