import { createRouter, createWebHistory } from 'vue-router'
import BoardView from '../pages/BoardView.vue'
import Boards from '../pages/Boards.vue'
import User from '../pages/User.vue'

const routes = [
  {
    path: '/',
    name: 'User',
    component: User,
  },
  {
    path: '/boards',
    name: 'Boards',
    component: Boards,
  },
  {
    path: '/boards/:id',
    name: 'BoardView',
    component: BoardView,
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

export default router

