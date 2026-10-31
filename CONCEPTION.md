# Pokémon Binder — Document de conception

> Ce document consigne toutes les décisions prises **avant** de coder.
> Chaque décision est datée. Une question ouverte reste dans la section dédiée tant qu'elle n'est pas tranchée.

---

## 1. Vision

Application web permettant de :

1. **Rechercher** une carte Pokémon et connaître sa **valeur** marchande.
2. **L'ajouter à un classeur numérique** pour savoir ce que je possède et ce que vaut ma collection.

---

## 2. Feuille de route

| Version | Contenu | Statut |
|---|---|---|
| **V1** | Recherche par nom / numéro / extension + ajout au classeur + valeur | 🟢 Codée, testée en local |
| V2 | Scan : OCR du numéro de carte (ex. `025/198`) via Tesseract.js | 🟡 Viseur codé (D38), à tester sur téléphone |
| V3 | Reconnaissance visuelle (embeddings CLIP + recherche de similarité) | ⚪ Peut-être |

---

## 3. Décisions prises

| # | Date | Décision | Raison |
|---|---|---|---|
| D1 | 2026-10-30 | On démarre par une **V1 sans scan** | Livrer vite un outil utile ; le scan est un chantier à part |
| D2 | 2026-10-30 | Stack par défaut : SvelteKit 2 + Svelte 5, TypeScript, Tailwind v4, Prisma, ~~Better Auth~~ (remplacé par G2 Hub, D5), `@guillaumeg/ui`, pnpm | Stack standard de mes projets |
| D3 | 2026-10-30 | Source de données cartes pressentie : **TCGdex** (gratuit, sans clé, cartes en FR, prix Cardmarket inclus) | pokemontcg.io est en fin de vie (successeur Scrydex payant) |
| D4 | 2026-10-30 | Les cartes et les prix sont **stockés en base** (pas d'appel API à chaque affichage) ; les prix sous forme d'**instantanés datés** | Éviter les limites de requêtes + garder un historique de valeur |
| D5 | 2026-10-30 | App **publique, multi-utilisateurs** ; authentification via **G2 Hub** (« Se connecter avec G2 Hub », OpenID Connect) — **pas de Better Auth** dans ce projet | Ne pas refaire login / mots de passe ; identité centralisée |
| D6 | 2026-10-30 | Les données d'un utilisateur (classeur) sont rattachées au **`sub`** du hub (identifiant unique renvoyé par OIDC) ; session = cookie signé, pas de table de sessions | Convention des sites branchés sur G2 Hub (cf. g2-erp `auth-g2hub.md`) |
| D7 | 2026-10-30 | Une carte est identifiée par sa **référence** (extension + numéro, ex. `sv01-025`), **indépendamment de la langue** ; la **langue** est un attribut de l'**exemplaire possédé** | Les langues sont mélangées dans la collection ; une même carte existe en FR / EN… |
| D8 | 2026-10-30 | Un exemplaire possédé porte : **quantité, variante, état, langue, prix d'achat** | Besoin exprimé ; pas de gradation (PSA…) en V1 |
| D9 | 2026-10-30 | V1 sur **invitation** : les utilisateurs sont invités depuis la console G2 Hub (onglet « Utilisateurs ») | L'inscription libre par application n'existe pas encore dans G2 Hub (DECISIONS.md §24, §45) ; elle viendra plus tard |
| D10 | 2026-10-30 | **Pas de cartes japonaises** : seulement les cartes internationales (FR, EN, DE, IT, ES…) qui partagent les mêmes références | Les cartes JP ont leurs propres extensions et numérotation |
| D11 | 2026-10-30 | Exemplaires enregistrés **par lot** : une ligne = carte + variante + état + langue, avec **quantité** et **prix d'achat unitaire moyen** | Simple à saisir ; suffisant pour estimer la plus-value |
| D12 | 2026-10-30 | Échelle d'état **Cardmarket** : MT, NM, EX, GD, LP, PL, PO | Standard européen, cohérent avec la source de prix |
| D13 | 2026-10-30 | **TCGdex = source unique** (cartes + prix Cardmarket en €). Vérifié : `GET /v2/fr/cards/sv01-025` renvoie `pricing.cardmarket` (`avg`, `low`, `trend`, `avg1/7/30`, + suffixe `-holo` pour reverse / holo, mis à jour quotidiennement) et `variants` (normal, reverse, holo, firstEdition) | Une seule API, gratuite, en français. Limite acceptée : prix global, toutes langues et tous états confondus |
| D14 | 2026-10-30 | Prix de référence = **`trend`** (ou `trend-holo` pour une variante reverse / holo) | Tendance Cardmarket : lisse les ventes isolées |
| D15 | 2026-10-30 | **Plusieurs classeurs** par utilisateur, affichés en **grille** | Organiser librement (par extension, par thème…) |
| D16 | 2026-10-30 | **Suivi de complétion** par extension (ex. « 120/198 cartes d'Écarlate et Violet ») | Objectif classique du collectionneur |
| D17 | 2026-10-30 | **Prix figé à l'acquisition** : à l'ajout d'un lot, on enregistre le `trend` du moment (`acquisitionMarketPrice`) + la date ; on le compare au `trend` actuel. Trois valeurs par lot : **prix payé**, **prix du marché à l'acquisition**, **prix du marché actuel** | Mesurer l'évolution de la cote depuis l'obtention, indépendamment du prix payé |
| D18 | 2026-10-30 | Un lot appartient à **un seul classeur** ; la complétion d'une extension se calcule sur **tous les classeurs** de l'utilisateur | On possède la carte ou non, peu importe où elle est rangée |
| D19 | 2026-10-30 | Complétion : une carte compte **une fois** (toutes variantes confondues) ; affichage sur le nombre **officiel** + secrètes à part, ex. « 120/198 (+12 secrètes) » | Lisible, conforme à la numérotation imprimée sur les cartes |
| D20 | 2026-10-30 | Ajout d'un exemplaire identique à un lot existant (même classeur, carte, variante, état, langue) → **fusion** : quantité additionnée, prix payé et prix figé recalculés en **moyenne pondérée** ; la date d'acquisition reste celle du **premier** ajout | Pas de doublons dans la grille ; garanti en base par une contrainte d'unicité |
| D21 | 2026-10-30 | Mise à jour des prix par une **tâche planifiée quotidienne**, uniquement pour les cartes présentes dans au moins un classeur ; un `PriceSnapshot` par carte et par jour | TCGdex ne rafraîchit ses prix qu'une fois par jour ; inutile d'interroger des cartes que personne ne possède |
| D22 | 2026-10-30 | **Liste de souhaits : plus tard** (hors V1) | Garder la V1 courte |
| D23 | 2026-10-30 | Statistique V1 : **valeur totale** de la collection (et par classeur) | Le besoin principal ; le reste viendra ensuite |
| D24 | 2026-10-30 | Conception **mobile first** | Usage principal sur téléphone (salon, brocante) |
| D25 | 2026-10-30 | V1 en **local** uniquement ; déploiement VPS plus tard | Valider l'usage avant d'héberger |
| D26 | 2026-10-30 | Image manquante en français → **repli sur l'image anglaise** (même id de carte) ; sans image nulle part → emplacement avec nom, numéro, extension | 3 856 / 22 201 cartes FR sans image ; 2 186 en ont une en anglais |
| D27 | 2026-10-30 | Prix moyens stockés avec **4 décimales** (`Decimal(12, 4)`), arrondis à l'affichage | Une moyenne arrondie au centime dérivait une fois remultipliée (−1,83 € au lieu de −1,82 €) |
| D28 | 2026-10-30 | Suppression d'un lot / d'un classeur confirmée dans une **popin** (`Modal`) | La confirmation en ligne s'affichait hors écran |
| D29 | 2026-10-30 | **Vue d'une extension** : toutes ses cartes, possédées (×quantité) ou **manquantes (grisées)**, filtre Toutes / Possédées / Manquantes ; cartes secrètes à part | Voir d'un coup d'œil ce qui manque pour compléter une extension |
| D30 | 2026-10-30 | **Profils** : un compte (G2 Hub) contient des **profils** (ex. « Charlie », « Papa »), **un profil = une collection**, sans sous-classeurs. **Révise D15** (classeurs de rangement) et **D18** (la complétion se calcule **par profil**, plus sur tout le compte) | Collection familiale : chaque personne suit ses propres cartes |
| D31 | 2026-10-30 | **Accueil du compte** : valeur totale de la famille + valeur de chaque profil ; un clic entre dans un profil (pas d'écran « Qui collectionne ? ») | Vue d'ensemble conservée, un clic pour entrer |
| D32 | 2026-10-30 | Dans la vue d'une extension, une carte possédée en **plusieurs lots** (ex. Normale + Reverse) s'affiche une fois ; le clic ouvre une **popin listant ses lots** | Accéder à chaque lot sans dupliquer la carte dans la grille |
| D33 | 2026-10-30 | **Scan par photo (V2, option A)** : bouton « Scanner » sur la recherche → appareil photo (`<input capture>`) → **OCR Tesseract.js dans le navigateur** du numéro « 025/198 » → recherche par numéro. **5 lectures** de la photo (entière, tiers bas, bande bas-gauche ×1 / ×2, bloc) et **vote majoritaire**. Le numéro reste modifiable ; si aucune extension n'a le total lu, toutes les cartes de ce numéro sont proposées | Gratuit, sans serveur. Mesuré : aucune lecture seule n'est fiable (025/198 lu 025/195), le vote corrige. Limites : photo de la carte entière et droite ; numéros de Galerie (`TG01/TG30`) non gérés ; un total mal lu peut tomber sur une vraie extension (Tempête Argentée, 195) |
| D34 | 2026-10-30 | **Déploiement sur le VPS** (révise D25) : `https://pokemon.g2webdev.fr`, PM2 `pokemon-binder` port 3040 derrière Nginx, PostgreSQL du VPS, connexion via le G2 Hub de production ; procédure dans `DEPLOY.md`, mise à jour par `git pull && ./scripts/deploy.sh` | Tester en conditions réelles, notamment le scan sur téléphone (HTTPS) |
| D35 | 2026-10-31 | **Toutes les variantes** (Normale, Reverse, Holo, 1ʳᵉ édition) sont proposées à l'ajout ; celles déclarées par TCGdex en premier, les autres marquées « (non répertoriée) ». Le serveur n'en refuse plus aucune | Les `variants` de TCGdex sont incomplètes : une variante réelle (la carte en main) était impossible à saisir |
| D36 | 2026-10-31 | **Deux parcours distincts** : la **recherche** est le seul chemin d'**ajout** (résultat → fiche carte + formulaire d'ajout). La **collection** (vue extension d'un profil) sert à **consulter et modifier** : une carte possédée (en couleur) ouvre **directement sa page de lot** (une popin demande laquelle s'il y a plusieurs versions) ; une carte manquante (noir et blanc) n'est qu'un repère, non cliquable. **Précise D32** | Retour d'usage : la popin « lots » puis la fiche avec formulaire d'ajout brouillaient la modification d'une carte possédée |
| D37 | 2026-10-31 | Dans la collection, une carte **manquante** (noir et blanc) ouvre la **fiche d'ajout** avec le **profil présélectionné** et un retour « ← profil · extension » ; après l'ajout, « Ajouter une autre carte » ramène à l'extension. **Assouplit D36** (l'ajout passe aussi par là) | Compléter une extension carte après carte sans repasser par la recherche |
| D38 | 2026-10-31 | **Scan par viseur** (révise D33) : « Scanner » ouvre la **caméra en direct** (`getUserMedia`, HTTPS) avec un **cadre de visée** ; seul le contenu du cadre (le numéro, en gros plan) est lu. Préparation : binarisation (seuil d'Otsu) ou contraste, agrandi à 1 200 px ; **3 lectures** (binarisé + mode 11, binarisé + mode 6, contrasté + mode 11) et vote majoritaire. Repli : photo en gros plan si la caméra est indisponible | Retour d'usage : le scan de la carte entière ne marchait pas. Mesuré sur 5 gros plans : **5/5** en < 1 s ; le mode « une ligne » faisait 0/5 et la lecture inversée doublait les erreurs |
| D39 | 2026-10-31 | Dans les **résultats de recherche**, une carte déjà possédée affiche un badge **✓ ×quantité** (tous profils) et le détail « Déjà : Charlie ×2 · Papa ×1 » ; une seule requête pour toute la page, filtrée sur le compte | Éviter d'acheter ou d'ajouter une carte en double sans le savoir |
| D40 | 2026-10-31 | La page d'un profil a **deux onglets** : « Extensions » (la vue actuelle) et « **Mes cartes** » : tous les lots en liste simple, **triés par cote** (décroissante par défaut, ou croissante, nom, numéro, ajout récent), avec **recherche** nom / référence (sans accents, « 025/198 ») et **filtres** variante, extension, état, langue ; total affiché (cartes, valeur). Filtrage dans le navigateur (instantané) ; onglet gardé dans l'URL (`?onglet=cartes`), un lot ouvert depuis la liste y ramène | Retour d'usage : retrouver et estimer ses cartes sans passer extension par extension |

---

## 4. Points d'attention

- **Inscription libre via G2 Hub** (après la V1) : il faudra ajouter dans G2 Hub un réglage
  « inscription libre » **par application** (prévu « plus tard » dans DECISIONS.md §24 / §44).
  Chantier côté hub, pas côté Pokémon Binder.
- **G2 Hub en local** : pour développer, le hub doit tourner en local (`pnpm db:up` + `pnpm dev`
  dans `g2-hub`, console sur `http://localhost:5180`). Il faut y créer l'**application**
  « Pokémon Binder » (offre Auth), déclarer l'URL de retour OIDC **exacte**
  (ex. `http://localhost:5200/auth/callback`) et inviter les utilisateurs.
- **Dépendance à TCGdex** : le 2026-10-30, l'API et les images TCGdex ont été indisponibles (404
  texte brut sur tout `api.tcgdex.net`). L'app doit **fonctionner en mode dégradé** : la recherche
  affiche « TCGdex indisponible », une carte déjà en cache reste consultable (D4).
- **Numéros de carte non numériques** (`TG01`, `SWSH001`, `GG35`…) : le calcul « officielle ou
  secrète » (D19) ne peut pas se contenter de comparer des nombres.

---

## 5. Questions ouvertes (à trancher ensemble)

_Aucune pour l'instant — toutes les questions de la V1 sont tranchées._

---

## 5 bis. Écrans V1 (validés le 2026-10-30, révisés le 2026-10-30 avec les profils D30)

| Route | Rôle |
|---|---|
| `/` | Accueil du compte : **valeur de la famille** + profils (valeur de chacun), création d'un profil (D31) |
| `/profils/[id]` | Un profil : sa valeur ; onglets **Extensions** (complétion, valeur) et **Mes cartes** (liste triable et filtrable, D40) ; renommer, supprimer |
| `/profils/[id]/extensions/[setId]` | Toutes les cartes d'une extension pour ce profil, possédées / manquantes, avec filtre (D29) ; carte possédée → **sa page de lot** (popin de choix si plusieurs versions, D36), manquante → **fiche d'ajout** pour ce profil (D37) |
| `/recherche` | Recherche par nom / numéro (`?profil=` conservé depuis un profil) |
| `/cartes/[id]` | Fiche carte → « Ajouter à un profil » (profil présélectionné via `?profil=`) |
| `/lots/[id]` | Détail d'un lot : prix payé / cote figée / cote actuelle ; modifier, supprimer |

_Remplacés par les profils (D30) : `/classeurs/[id]`, `/extensions`, `/extensions/[id]`._

## 5 ter. Ordre de construction (validé le 2026-10-30)

1. **Scaffold** : SvelteKit + Prisma + `@guillaumeg/ui`, `git init`
2. **Connexion G2 Hub** : OIDC (code + PKCE) + cookie de session signé
3. **Synchronisation TCGdex** : recherche + cache `Card` / `CardSet`
4. **Classeurs et lots** : CRUD, ajout avec fusion (D20), prix figé (D17)
5. **Prix** : tâche quotidienne (D21) + valeur totale (D23)
6. **Complétion** par extension (D16, D19)

---

## 6. Modèle de données (validé le 2026-10-30)

> Pseudo-schéma Prisma. Montants en `Decimal` (jamais `Float` : les nombres à virgule flottante
> font des erreurs d'arrondi, ex. `0.1 + 0.2 = 0.30000000000000004`).

### Référentiel (cache local de TCGdex, partagé par tous les utilisateurs)

```prisma
model CardSet {
  id            String  @id          // TCGdex set id, e.g. "sv01"
  name          String               // French name, e.g. "Écarlate et Violet"
  logoUrl       String?
  symbolUrl     String?
  officialCount Int                  // e.g. 198 (printed numbering)
  totalCount    Int                  // e.g. 258 (with secret cards)
  cards         Card[]
}

model Card {
  id            String  @id          // TCGdex card id, e.g. "sv01-025" (the reference, D7)
  setId         String
  localId       String               // number in the set, e.g. "025"
  name          String               // French name
  imageUrl      String?
  rarity        String?
  variants      CardVariant[]        // variants that exist for this card (from TCGdex)
  cardmarketId  Int?
  syncedAt      DateTime             // last refresh from TCGdex
  set           CardSet          @relation(...)
  prices        PriceSnapshot[]
  items         CollectionItem[]
}

model PriceSnapshot {                // D4: one row per card per day
  id         String   @id
  cardId     String
  date       DateTime @db.Date
  trend      Decimal?              // EUR
  trendHolo  Decimal?              // EUR, reverse / holo version
  low        Decimal?
  avg        Decimal?
  @@unique([cardId, date])
}
```

### Collection (propre à chaque utilisateur)

```prisma
model Binder {                       // D15
  id         String   @id
  ownerSub   String                  // G2 Hub `sub` (D6) — no User table
  name       String
  createdAt  DateTime
  items      CollectionItem[]
  @@index([ownerSub])
}

model CollectionItem {               // a lot (D11)
  id                     String        @id
  binderId               String
  cardId                 String
  variant                CardVariant   // NORMAL | REVERSE | HOLO | FIRST_EDITION
  condition              CardCondition // MT | NM | EX | GD | LP | PL | PO (D12)
  language               CardLanguage  // FR | EN | DE | IT | ES | PT | NL… (D10: no JA)
  quantity               Int
  purchaseUnitPrice      Decimal?      // average price paid per card (D11, D20)
  acquisitionMarketPrice Decimal?      // trend frozen at acquisition (D17, D20)
  acquiredAt             DateTime      // first acquisition (D20)
  @@unique([binderId, cardId, variant, condition, language])   // enforces the merge (D20)
}
```

### Règles dérivées

- **Valeur actuelle d'un lot** = `quantity` × dernier `trend` (ou `trendHolo` si variante REVERSE / HOLO).
- **Complétion d'une extension** (D18, D19) = nombre de `cardId` distincts de l'extension parmi
  tous les lots de l'utilisateur, séparé entre `localId` ≤ `officialCount` et cartes secrètes.
- **Sécurité** : toute requête sur `Binder` / `CollectionItem` est filtrée par `ownerSub` de la
  session ; un id appartenant à un autre utilisateur → **404**.

---

## 7. Hors périmètre V1

- Scan / reconnaissance d'image
- Achat / vente / échange entre utilisateurs
- Cartes gradées (PSA, PCA…)
- Cartes japonaises
- Inscription libre (V1 sur invitation)
- Liste de souhaits
- Statistiques avancées (top cartes, évolution dans le temps)
- Déploiement sur le VPS
