# OS Gateway — Console Admin (Frontend)

Console d’exploitation Angular 20 pour la plateforme **OS Gateway Mobile Money** : supervision des gateways Android, transactions USSD, SMS, alertes, rapports et administration.

## Stack

- Angular 20 (standalone components)
- PrimeNG 20 + PrimeIcons
- Tailwind CSS 3
- Chart.js (via `primeng/chart`)
- RxJS

## Prérequis

- Node.js 20+
- npm 10+
- API backend disponible sur `http://localhost:8080` (optionnel : mode mock intégré)

## Installation

```bash
cd frontend_os_gateway
npm install
```

## Lancement (développement)

```bash
npm start
# ou
npx ng serve --proxy-config proxy.conf.json
```

Ouvrir [http://localhost:4200](http://localhost:4200).

Compte démo (si l’API auth n’est pas joignable) :

- **Identifiant** : `admin`
- **Mot de passe** : `Admin@123`

## Build production

```bash
npm run build
```

Artefacts générés dans `dist/frontend_os_gateway/browser`.

## Docker

```bash
docker build -t os-gateway-frontend .
docker run --rm -p 8088:80 os-gateway-frontend
```

## Configuration API

| Fichier | Usage |
|---------|--------|
| `src/environments/environment.development.ts` | Dev : `apiUrl = '/api/v1'` via proxy |
| `src/environments/environment.ts` | Prod : `http://localhost:8080/api/v1` |
| `proxy.conf.json` | Proxy local vers le backend |

Le token JWT est stocké dans `localStorage` et injecté via l’intercepteur HTTP (`Authorization: Bearer …`).

## Structure

```
src/app/
  core/          # auth, guards, interceptors, services API
  shared/        # composants & pipes
  layout/        # shell sidebar + topbar
  features/      # pages métier
```

## Pages

Dashboard, Transactions, SMS, Gateways (+ détail), Utilisateurs, Opérateurs, Comptes distributeurs, Historique, Alertes, Rapports, Statistiques, Journal, Paramètres, Administration (RBAC placeholder).
