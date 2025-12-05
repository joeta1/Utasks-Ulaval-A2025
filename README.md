# UTasks - Manage Your Tasks as You Want! 📋

UTasks is a Trello-like web application built with **Vue 3**, **TypeScript**, and **TailwindCSS**.  
It allows users to create an account, log in, and manage their tasks by creating, editing, and organizing boards, lists, and cards through a clean and interactive interface.

## ✨ Features
- ✅ User authentication with JWT tokens (login, register, logout)
- ✅ Create / Delete / Edit boards, lists, and cards
- ✅ View all user boards, lists, and cards
- ✅ Drag & drop cards between lists (desktop & mobile support)
- ✅ Reorder lists with drag & drop
- ✅ Sort cards by priority, due date, or both
- ✅ Dark mode support
- ✅ Fully responsive design

## 🛠️ Technologies

### Frontend
- [**Vue 3**](https://vuejs.org/) – Progressive JavaScript framework  
- [**TypeScript**](https://www.typescriptlang.org/) – Typed superset of JavaScript  
- [**Vite**](https://vitejs.dev/) – Fast build tool and dev server
- [**TailwindCSS v4**](https://tailwindcss.com/) – Utility-first CSS framework  
- [**ESLint**](https://eslint.org/) & [**Prettier**](https://prettier.io/) – Code quality and formatting  
- [**Husky**](https://typicode.github.io/husky/) – Git hooks for code quality
- [**Vitest**](https://vitest.dev/) – Testing framework

### Backend
- [**Node.js**](https://nodejs.org/) – JavaScript runtime
- [**Express**](https://expressjs.com/) – Web framework for Node.js
- [**MongoDB**](https://www.mongodb.com/) – NoSQL database
- [**Mongoose**](https://mongoosejs.com/) – MongoDB ODM
- [**JWT**](https://jwt.io/) – JSON Web Tokens for authentication
- [**bcryptjs**](https://www.npmjs.com/package/bcryptjs) – Password hashing

## 📁 Project Structure

```
utasks/
├── frontend/             # Frontend (Vue.js)
│   ├── src/
│   │   ├── components/   # Vue components
│   │   ├── pages/        # Page views
│   │   ├── router/       # Vue Router
│   │   └── services/     # API services
│   └── package.json
├── backend/              # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── middleware/   # Authentication middleware
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   └── server.js     # Entry point
│   └── package.json
└── README.md
```

## 🚀 Installation and Running Locally

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)

### Backend Setup

1. **Navigate to backend folder**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/utasks
   JWT_SECRET=your-secret-key
   PORT=3000
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start the backend server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** at `http://localhost:5173`

### Available Scripts

#### Frontend (from `frontend/` folder)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier

#### Backend (from `backend/` folder)
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier

## 🌐 Live Demo
Test the application online: **[https://ulaval-glo3102-utasks-a2025-team-37.netlify.app/](https://ulaval-glo3102-utasks-a2025-team-37.netlify.app/)**

Access it from any device (phone, tablet, desktop, laptop)!
## 📖 How to Use

### First Time Setup
1. On launch, you will be asked to create a username
2. ⚠️ **Important**: To avoid API conflicts, use unique usernames like:
   - `JordanEtaba15`
   - `JordanEtaba16`
   - `YourName123`
   - etc.

### User Management
- The **Logout button** temporarily deletes the user from the API database and returns you to the home page
- This allows you to reuse the same username multiple times without errors during testing

### API Backend
The app uses a public REST API provided at:
- **Base URL**: `https://utasks-026af75f15a3.herokuapp.com/`
- **Documentation**: [https://utasks-026af75f15a3.herokuapp.com/docs/#/](https://utasks-026af75f15a3.herokuapp.com/docs/#/)

## 👨‍💻 Contributors
- **Jordan Etaba Bikoun** 

## 📄 License
This project is part of the GLO-3102 course at Université Laval.
