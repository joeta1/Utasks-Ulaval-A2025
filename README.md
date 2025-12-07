# UTasks - Manage Your Tasks as You Want! 📋 (Still in development!)

UTasks is a Trello-like web application built with **Vue 3**, **TypeScript**, and **TailwindCSS** for the frontend, and **Node.js**, **Express**, and **MongoDB** for the backend.  
It allows users to create an account, log in, and manage their tasks by creating, editing, and organizing boards, lists, and cards through a clean and interactive interface.

## ✨ Features
- ✅ User authentication with JWT tokens (login, register, logout)
- ✅ Create / Delete / Edit boards, lists, and cards
- ✅ View all user boards, lists, and cards
- ✅ Drag & drop cards between lists (desktop & mobile support)
- ✅ Reorder lists with drag & drop
- ✅ Sort cards by priority, due date, or both
- ✅ Card priority levels (High, Medium, Low) with color coding
- ✅ Dark mode support
- ✅ Fully responsive design
- ✅ **Real-time chat** with WebSocket (Socket.io)
  - General chat room for all users
  - Private messaging between users
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
- [**Socket.io**](https://socket.io/) – Real-time bidirectional communication

## 📁 Project Structure

```
utasks/
├── frontend/             # Frontend (Vue.js)
│   ├── src/
│   │   ├── components/   # Vue components (ChatWidget, BoardHeader, etc.)
│   │   ├── pages/        # Page views
│   │   ├── router/       # Vue Router
│   │   └── services/     # API services (api.js, socket.js)
│   └── package.json
├── backend/              # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── middleware/   # Authentication middleware (JWT)
│   │   ├── models/       # MongoDB models (User, Board, List.)
│   │   ├── routes/       # API routes (auth, boards, cards...)
│   │   ├── socket.js     # Socket.io configuration
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

3. **Create `.env` file** (copy from `.env.example` (in **backend folder**)):
   
4. **Configure environment variables (it should be already there)** in `.env`:
   ```env
   # MongoDB Connection. You can use this or your own MongoDB URI.

   MONGODB_URI=mongodb://localhost:27017/utasks

   # JWT Secret (change this in production!)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production

   # Server Port
   PORT=3000

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173

   ```
   
   **⚠️ CRITICAL**: Now, you just have to generate a secure JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy the generated string and use it as your JWT_SECRET value.

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

3. **Create `.env` file** (copy from `.env.example` (in **frontend folder**)):
  
4. **Configure environment variables (it should be already there)** in `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser** at `http://localhost:5173`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user info |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register user (legacy) |
| GET | `/api/users/:id` | Get user by ID |
| DELETE | `/api/users/:id` | Delete user |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/boards` | Create a new board |
| GET | `/api/boards/:id` | Get board by ID |
| PUT | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| GET | `/api/boards/user/:userId` | Get all boards for a user |

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lists` | Create a new list |
| GET | `/api/lists/:id` | Get list by ID |
| PUT | `/api/lists/:id` | Update list |
| DELETE | `/api/lists/:id` | Delete list |
| GET | `/api/lists/board/:boardId` | Get all lists for a board |

### Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cards` | Create a new card |
| GET | `/api/cards/:id` | Get card by ID |
| PUT | `/api/cards/:id` | Update card |
| DELETE | `/api/cards/:id` | Delete card |
| GET | `/api/cards/list/:listId` | Get all cards for a list |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome message |
| GET | `/api/health` | Health check |

### Chat (Real-time)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/messages/:room` | Get message history for a room |
| GET | `/api/chat/private/:userId` | Get private messages with a user |
| GET | `/api/chat/users/online` | Get list of online users |
| GET | `/api/chat/conversations` | Get recent conversations |

## 📜 Available Scripts

### Frontend (from `frontend/` folder)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier

### Backend (from `backend/` folder)
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier

## 🌐 Live Demo
Test the application online: **[https://ulaval-glo3102-utasks-a2025-team-37.netlify.app/](https://ulaval-glo3102-utasks-a2025-team-37.netlify.app/)**

The Api runs at **https://utasks-a2025-utasks-a2025-team-37.onrender.com**

**WARNING**: The Api actually goes down after 15 minutes of inactivity, So when you try to log in/out (call a request basically) after a while or for the first time, make sure to refresh the page

Access it from any device (phone, tablet, desktop, laptop)!
## 📖 How to Use

### First Time Setup
1. Launch the app locally or via the link provided previously
2. Create an account with username and password
3. Start creating boards, lists, and cards!

**NOTE:** As i said earlier, you may have to refresh the page and resume your requests because of renderer auto sleep-down.

### Features
- **Boards**: Create multiple boards to organize different projects
- **Lists**: Add lists to boards (e.g., "To Do", "In Progress", "Done")
- **Cards**: Add cards to lists with title, description, due date, and priority
- **Drag & Drop**: Move cards between lists or reorder lists
- **Priority**: Set card priority (High 🔴, Medium 🟡, Low 🟢)
- **Real-time Chat**: Click the chat icon 💬 in the bottom-right corner to:
  - Chat with all online users in the general room
  - Start private conversations with specific users

## 👥 Team
- Jordan Etaba Bikoun

## 📄 License
This project is for educational purposes as part of the GLO3102 course at Université Laval and is still in development.
