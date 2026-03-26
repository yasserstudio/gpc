<script setup lang="ts">
import { ref, onMounted } from "vue";

const STORAGE_KEY = "gpc-banner-dismissed-v0945";
const visible = ref(false);

onMounted(() => {
  visible.value = !sessionStorage.getItem(STORAGE_KEY);
});

function dismiss() {
  sessionStorage.setItem(STORAGE_KEY, "1");
  visible.value = false;
}
</script>

<template>
  <div v-if="visible" class="ann-banner" role="banner">
    <span class="ann-badge">Pre-release</span>
    <span class="ann-text">
      v0.9.45 is out —
      <a
        href="https://github.com/yasserstudio/gpc"
        target="_blank"
        rel="noopener noreferrer"
        class="ann-link"
        >star on GitHub</a
      >
      to follow the road to v1.0
    </span>
    <button class="ann-close" aria-label="Dismiss" @click="dismiss">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.ann-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 40px 8px 16px;
  background: var(--vp-c-brand-soft);
  border-bottom: 1px solid var(--vp-c-brand-1);
  border-bottom-color: rgba(46, 66, 147, 0.2);
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  position: relative;
  text-align: center;
}

.dark .ann-banner {
  background: rgba(77, 149, 241, 0.06);
  border-bottom-color: rgba(77, 149, 241, 0.15);
}

.ann-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(46, 66, 147, 0.12);
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.dark .ann-badge {
  background: rgba(77, 149, 241, 0.15);
}

.ann-text {
  line-height: 1.4;
}

.ann-link {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}

.ann-link:hover {
  opacity: 0.75;
}

.ann-close {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  padding: 0;
}

.ann-close:hover {
  color: var(--vp-c-text-1);
  background: rgba(0, 0, 0, 0.06);
}

.dark .ann-close:hover {
  background: rgba(255, 255, 255, 0.06);
}

.ann-close svg {
  width: 13px;
  height: 13px;
}
</style>
