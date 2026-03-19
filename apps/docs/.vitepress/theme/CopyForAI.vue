<script setup lang="ts">
import { useData } from "vitepress";
import { ref, computed } from "vue";

const { page } = useData();
const state = ref<"idle" | "loading" | "copied" | "error">("idle");

const rawUrl = computed(
  () =>
    `https://raw.githubusercontent.com/yasserstudio/gpc/main/apps/docs/${page.value.relativePath}`,
);

async function copyAsMarkdown() {
  if (state.value !== "idle") return;
  state.value = "loading";
  try {
    const res = await fetch(rawUrl.value);
    if (!res.ok) throw new Error("fetch failed");
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    state.value = "copied";
  } catch {
    state.value = "error";
  } finally {
    setTimeout(() => {
      state.value = "idle";
    }, 2200);
  }
}
</script>

<template>
  <div class="copy-ai-wrap">
    <button
      class="copy-ai-btn"
      :class="state"
      :disabled="state !== 'idle'"
      :aria-label="state === 'copied' ? 'Copied!' : 'Copy page as Markdown for AI'"
      @click="copyAsMarkdown"
    >
      <!-- Sparkle / AI icon -->
      <span class="copy-ai-icon" aria-hidden="true">
        <svg
          v-if="state === 'idle' || state === 'loading'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
          />
        </svg>
        <svg
          v-else-if="state === 'copied'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>

      <span class="copy-ai-label">
        <template v-if="state === 'idle'">Copy for AI</template>
        <template v-else-if="state === 'loading'">Fetching…</template>
        <template v-else-if="state === 'copied'">Copied!</template>
        <template v-else>Error</template>
      </span>
    </button>
  </div>
</template>

<style scoped>
.copy-ai-wrap {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  margin-top: -4px;
}

.copy-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  background: transparent;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-base);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
  white-space: nowrap;
}

.copy-ai-btn:hover:not(:disabled) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.copy-ai-btn.loading {
  opacity: 0.6;
  cursor: default;
}

.copy-ai-btn.copied {
  color: #3fb950;
  border-color: rgba(63, 185, 80, 0.4);
  background: rgba(63, 185, 80, 0.07);
}

.copy-ai-btn.error {
  color: #f85149;
  border-color: rgba(248, 81, 73, 0.4);
  background: rgba(248, 81, 73, 0.07);
}

.copy-ai-icon {
  display: inline-flex;
  align-items: center;
}

.copy-ai-icon svg {
  width: 13px;
  height: 13px;
}

.copy-ai-btn.loading .copy-ai-icon svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
