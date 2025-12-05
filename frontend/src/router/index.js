import { createRouter, createWebHistory } from 'vue-router'
import BoardView from '../pages/BoardView.vue'
import Boards from '../pages/Boards.vue'
import User from '../pages/User.vue'
import Login from '../pages/Login.vue'

// Check if user is authenticated
function isAuthenticated() {
  return !!localStorage.getItem('token') || !!localStorage.getItem('userId')
}

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: () => {
      return isAuthenticated() ? '/boards' : '/login'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'User',
    component: User,
    meta: { guest: true }
  },
  {
    path: '/boards',
    name: 'Boards',
    component: Boards,
    meta: { requiresAuth: true }
  },
  {
    path: '/boards/:id',
    name: 'BoardView',
    component: BoardView,
    meta: { requiresAuth: true }
  }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,

  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authenticated = isAuthenticated()
  
  if (to.meta.requiresAuth && !authenticated) {
    // Redirect to login if not authenticated
    next('/login')
  } else if (to.meta.guest && authenticated) {
    // Redirect to boards if already authenticated
    next('/boards')
  } else {
    next()
  }
})

export default router

