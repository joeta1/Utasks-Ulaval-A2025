# UTasks - Manage Your Tasks as You Want! 📋

UTasks is a Trello-like web application built with **Vue 3**, **TypeScript**, and **TailwindCSS**.  
It allows users to create an account, log in, and manage their tasks by creating, editing, and organizing boards, lists, and cards through a clean and interactive interface.

> ⚠️ **Note**: In this first version, authentication is simplified: users only need to enter a username to be instantly redirected to their profile (no token handling yet).

## ✨ Features
- ✅ Create a user by entering a username (instant login for this version)
- ✅ Create / Delete / Edit boards, lists, and cards
- ✅ View all user boards, lists, and cards
- ✅ Drag & drop cards between lists (desktop & mobile support)
- ✅ Reorder lists with drag & drop
- ✅ Sort cards by priority, due date, or both
- ✅ Dark mode support
- ✅ Fully responsive design

## 🛠️ Technologies
- [**Vue 3**](https://vuejs.org/) – Progressive JavaScript framework  
- [**TypeScript**](https://www.typescriptlang.org/) – Typed superset of JavaScript  
- [**Vite**](https://vitejs.dev/) – Fast build tool and dev server
- [**TailwindCSS v4**](https://tailwindcss.com/) – Utility-first CSS framework  
- [**ESLint**](https://eslint.org/) & [**Prettier**](https://prettier.io/) – Code quality and formatting  
- [**Husky**](https://typicode.github.io/husky/) – Git hooks for code quality
- [**Vitest**](https://vitest.dev/) – Testing framework

## 🚀 Installation and Running Locally

### Prerequisites
- Node.js 18+ and npm

### Steps
1. **Clone the repository**:

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** at `http://localhost:5173`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
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
