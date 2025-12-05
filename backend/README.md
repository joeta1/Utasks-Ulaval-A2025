# UTasks Backend

Backend API pour l'application UTasks - Livrable 2.

## Prérequis

- Node.js (v18+)
- MongoDB (local ou MongoDB Atlas)

## Installation

1. Installez les dépendances :
```bash
cd backend
npm install
```

2. Créez un fichier `.env` basé sur `.env.example` :
```bash
cp .env.example .env
```

3. Configurez les variables d'environnement dans `.env` :
```
MONGODB_URI=mongodb://localhost:27017/utasks
JWT_SECRET=votre-secret-jwt-super-securise
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Démarrage

### Développement
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Authentification
- `POST /api/auth/register` - Créer un nouveau compte
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/logout` - Se déconnecter
- `GET /api/auth/me` - Obtenir l'utilisateur actuel

### Utilisateurs
- `POST /api/users/register` - Créer un utilisateur (legacy)
- `GET /api/users/:id` - Obtenir un utilisateur par ID
- `DELETE /api/users/:id` - Supprimer un utilisateur

### Boards
- `POST /api/boards` - Créer un board
- `GET /api/boards/:id` - Obtenir un board par ID
- `PUT /api/boards/:id` - Mettre à jour un board
- `DELETE /api/boards/:id` - Supprimer un board
- `GET /api/boards/user/:userId` - Obtenir les boards d'un utilisateur

### Lists
- `POST /api/lists` - Créer une liste
- `GET /api/lists/:id` - Obtenir une liste par ID
- `PUT /api/lists/:id` - Mettre à jour une liste
- `DELETE /api/lists/:id` - Supprimer une liste
- `GET /api/lists/board/:boardId` - Obtenir les listes d'un board

### Cards
- `POST /api/cards` - Créer une carte
- `GET /api/cards/:id` - Obtenir une carte par ID
- `PUT /api/cards/:id` - Mettre à jour une carte
- `DELETE /api/cards/:id` - Supprimer une carte
- `GET /api/cards/list/:listId` - Obtenir les cartes d'une liste

### Health
- `GET /` - Message de bienvenue
- `GET /api/health` - Vérification de santé de l'API

## Structure du projet

```
backend/
├── src/
│   ├── server.js          # Point d'entrée
│   ├── middleware/
│   │   └── auth.js        # Middleware d'authentification JWT
│   ├── models/
│   │   ├── User.js        # Modèle utilisateur
│   │   ├── Board.js       # Modèle board
│   │   ├── List.js        # Modèle liste
│   │   └── Card.js        # Modèle carte
│   └── routes/
│       ├── auth.js        # Routes d'authentification
│       ├── users.js       # Routes utilisateurs
│       ├── boards.js      # Routes boards
│       ├── lists.js       # Routes listes
│       ├── cards.js       # Routes cartes
│       └── health.js      # Routes health check
├── .env.example
├── package.json
└── README.md
```

## Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification. Incluez le token dans l'en-tête `Authorization` :

```
Authorization: Bearer <votre-token>
```
