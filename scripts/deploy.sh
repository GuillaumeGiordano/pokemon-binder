#!/usr/bin/env bash
#
# Production deploy of Pokémon Binder (VPS + PM2, behind Nginx). See DEPLOY.md.
#
# Usage (on the VPS):   cd ~/pokemon-binder && git pull && ./scripts/deploy.sh
#
# Install deps, apply the Prisma schema, build, then (re)start PM2. The configuration lives in
# .env, loaded through `--env-file` (see the pm2 start command below).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP=pokemon-binder

step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }

command -v pm2 >/dev/null || { echo "✗ pm2 introuvable dans le PATH."; exit 1; }
[ -f .env ] || { echo "✗ .env introuvable dans $ROOT (voir .env.example)."; exit 1; }
PORT=$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '"')
PORT=${PORT:-3040}

echo "Déploiement de $(git rev-parse --short HEAD 2>/dev/null || echo '?') dans $ROOT"

step "1/4 · Dépendances (pnpm install)"
pnpm install --frozen-lockfile

step "2/4 · Base de données (prisma generate + db push)"
# db push refuses a change that would lose data (no --accept-data-loss): the deploy stops here
# and the running version stays untouched.
pnpm db:generate
pnpm db:push

step "3/4 · Build"
pnpm build

step "4/4 · Redémarrage PM2"
if pm2 describe "$APP" >/dev/null 2>&1; then
	pm2 restart "$APP" --update-env
else
	pm2 start build/index.js --name "$APP" --node-args="--env-file=$ROOT/.env"
fi
pm2 save

# Liveness: without a session every page redirects to /connexion (303); "000" = not listening yet.
# The redirect TARGET is checked too: another app on the same port also answers 303 (seen on
# 2026-10-30: g2-erp held port 3030 and redirected to /login, the deploy looked fine).
result=000
for _ in 1 2 3 4 5; do
	sleep 2
	result=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 5 "http://127.0.0.1:$PORT/" 2>/dev/null || true)
	[ "${result%% *}" != "000" ] && break
done
if [[ "$result" == "303 "*"/connexion" ]]; then
	echo "· $APP : ✓ HTTP 303 → /connexion"
else
	echo "· $APP : ✗ réponse « $result » sur le port $PORT (attendu : 303 → /connexion)."
	echo "  Autre app sur ce port ? sudo ss -tlnp | grep ':$PORT\\b' · Logs : pm2 logs $APP --lines 50 --nostream"
	exit 1
fi

printf '\n\033[1;32m✓ Déploiement terminé.\033[0m\n'
