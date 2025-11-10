<script setup lang="ts">
const items = [
  { label: "Jordan Etaba Bikoun" },
]
</script>
<template>
  <footer
    class="border-t border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4"
  >
    <!-- Left -->
    <div class="text-center md:text-left">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        UTask - Team 37
      </p>
    </div>

    <!-- Center navigation -->
    <nav class="flex flex-wrap gap-3 justify-center">
      <a
        v-for="(item, i) in items"
        :key="i"
        href="#"
        class="text-sm transition-colors"
      >
        {{ item.label }}
      </a>
    </nav>

    <!-- Right (GitHub link) -->
    <div>
      <a
        href="https://github.com/GLO3102/utasks-a2025-utasks-a2025-team-37"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 text-slate-500 dark:text-slate-200 hover:text-blue-500 dark:hover:text-blue-400 transition"
        aria-label="GitHub"
      >
        <!-- GitHub Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 0C5.37 0 0 5.37 0 12a12 12 0 008.21 11.43c.6.11.82-.26.82-.58v-2.17c-3.34.73-4.04-1.61-4.04-1.61A3.17 3.17 0 004.63 17c-1.09-.74.08-.73.08-.73a2.5 2.5 0 011.82 1.22 2.53 2.53 0 003.45.99 2.5 2.5 0 01.75-1.58c-2.66-.3-5.47-1.33-5.47-5.93a4.63 4.63 0 011.23-3.21 4.3 4.3 0 01.12-3.17s1-.32 3.3 1.22a11.5 11.5 0 016 0c2.3-1.54 3.3-1.22 3.3-1.22a4.3 4.3 0 01.12 3.17A4.63 4.63 0 0120 11.9c0 4.61-2.81 5.63-5.48 5.93a2.79 2.79 0 01.8 2.17v3.23c0 .32.21.7.82.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
      </a>
    </div>
  </footer>
</template>