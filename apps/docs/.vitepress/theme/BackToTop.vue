<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > 400;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <Transition name="btt">
    <button v-if="visible" class="btt-btn" aria-label="Back to top" @click="scrollToTop">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 12V4M4 8l4-4 4 4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.btt-btn {
  position: fixed;
  bottom: 32px;
  right: 28px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(26, 115, 232, 0.35);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.15s ease;
  z-index: 100;
}

.btt-btn:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(26, 115, 232, 0.45);
}

.dark .btt-btn {
  box-shadow: 0 4px 20px rgba(77, 149, 241, 0.35);
}

.btt-enter-active,
.btt-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
