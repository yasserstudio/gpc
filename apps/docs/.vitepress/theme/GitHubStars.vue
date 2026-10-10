<script setup lang="ts">
import { onMounted, ref } from "vue";

const REPO = "yasserstudio/gpc";
const CACHE_KEY = "gpc-github-stars";
const CACHE_MS = 6 * 60 * 60 * 1000;

const stars = ref<number | null>(null);

function readCache(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { count, at } = JSON.parse(raw) as { count: number; at: number };
    return Date.now() - at < CACHE_MS && Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

function writeCache(count: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count, at: Date.now() }));
  } catch {
    // Storage blocked (private window): the count is simply fetched again next time.
  }
}

onMounted(async () => {
  const cached = readCache();
  if (cached !== null) {
    stars.value = cached;
    return;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const count = (await res.json()).stargazers_count;
    if (typeof count === "number") {
      stars.value = count;
      writeCache(count);
    }
  } catch {
    // Offline or rate-limited: the button still links to GitHub, without a count.
  }
});

const format = (n: number) => new Intl.NumberFormat("en-US").format(n);
</script>

<template>
  <a
    class="gh-stars"
    :href="`https://github.com/${REPO}`"
    target="_blank"
    rel="noopener"
    :aria-label="stars === null ? 'GPC on GitHub' : `GPC on GitHub, ${format(stars)} stars`"
  >
    <span v-if="stars !== null" class="gh-stars-count">{{ format(stars) }}</span>
    <span class="gh-stars-label">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
        />
      </svg>
      <span class="gh-stars-text">Star on GitHub</span>
    </span>
  </a>
</template>

<style scoped>
.gh-stars {
  display: inline-flex;
  align-items: stretch;
  height: 32px;
  margin-left: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.2s;
}

.gh-stars:hover {
  border-color: var(--vp-c-brand-1);
}

.gh-stars-count {
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-variant-numeric: tabular-nums;
  border-right: 1px solid var(--vp-c-divider);
}

.gh-stars-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  background: var(--vp-c-bg-soft);
}

.gh-stars:hover .gh-stars-label {
  background: var(--vp-c-default-soft);
}

/* Below 1024px the nav bar has no room (on phones it pushed the menu button
   off-screen, on tablets the page scrolled sideways), so the plain GitHub icon
   from socialLinks shows instead. */
@media (max-width: 1023px) {
  .gh-stars {
    display: none;
  }
}
</style>
