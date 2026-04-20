<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

// Bump this with each release so dismissals from the previous version
// don't silently suppress the new banner.
const STORAGE_KEY = "gpc-banner-dismissed-v0963-at";
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h — banner re-appears after this
const TAP_PAUSE_MS = 6000; // pause ticker for 6s after a tap so touch users
// have time to read and activate the link inside the banner

const visible = ref(false);
const paused = ref(false);
let resumeTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  try {
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const ageMs = Date.now() - dismissedAt;
    visible.value = !dismissedAt || ageMs >= DISMISS_WINDOW_MS;
  } catch {
    // localStorage disabled (private mode, blocked, quota) — fail open.
    visible.value = true;
  }
});

onBeforeUnmount(() => {
  if (resumeTimer) clearTimeout(resumeTimer);
});

function dismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore; banner just won't persist this tab's dismissal.
  }
  visible.value = false;
}

// Touch users can't reliably tap a moving link. Tapping the wrapper pauses
// the ticker for TAP_PAUSE_MS so the user can read + tap the link with
// a stationary target. Auto-resumes after the window so the banner keeps
// animating if the user moves on.
function pauseTicker() {
  paused.value = true;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    paused.value = false;
  }, TAP_PAUSE_MS);
}
</script>

<template>
  <div v-if="visible" class="ann-banner" role="banner">
    <span class="ann-badge">Pre-release</span>
    <div
      class="ann-text-wrapper"
      :class="{ 'ann-paused': paused }"
      @click="pauseTicker"
      @touchstart.passive="pauseTicker"
    >
      <span class="ann-text">
        v0.9.63 &middot; New: <code>--ai</code> on
        <code>gpc changelog generate --target play-store</code> translates release notes via your
        own Anthropic, OpenAI, Google, or Vercel AI Gateway key.
        <a href="/gpc/guide/multilingual-release-notes#ai-translation" class="ann-link"
          >AI translation guide</a
        >
        &middot; road to v1.0
      </span>
    </div>
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
  /* Critical: the ticker uses padding-left: 100% which would otherwise push
     the banner (and the whole page) wider than the viewport. Clip at the
     banner level so the ticker stays contained. */
  max-width: 100vw;
  box-sizing: border-box;
  overflow: hidden;
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

.ann-text-wrapper {
  min-width: 0;
  line-height: 1.4;
}

.ann-text {
  line-height: 1.4;
}

/* Mobile: slide the banner message as a ticker so the full copy is legible
   without forcing a two-line wrap on narrow screens. Pauses on hover/focus/
   tap so users can still read and click the link. Reduced-motion users
   get the static fallback below. */
@media (max-width: 640px) and (prefers-reduced-motion: no-preference) {
  .ann-banner {
    padding-left: 12px;
    padding-right: 30px;
    text-align: left;
    gap: 0;
  }
  /* Hide the PRE-RELEASE chip on mobile — it eats ~80px of precious width
     and the ticker text carries the same context ("v0.9.63 · New: ..."). */
  .ann-badge {
    display: none;
  }
  .ann-text-wrapper {
    flex: 1 1 auto;
    overflow: hidden;
    white-space: nowrap;
    /* Soft fade on both edges so text doesn't hard-clip against the bezel
       (left) or the dismiss button (right). */
    mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 14px,
      #000 calc(100% - 14px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 14px,
      #000 calc(100% - 14px),
      transparent 100%
    );
  }
  .ann-text {
    display: inline-block;
    padding-left: 100%;
    /* 22s loop — shorter than desktop-width ticker cadence so the message
       completes a full pass in the narrow mobile viewport within attention
       span. Paired with the tap-to-pause JS below so users can read. */
    animation: ann-ticker 22s linear infinite;
  }
  /* Keyboard/pointer users get hover/focus pause. Touch users get the
     click/touchstart handler in script which toggles .ann-paused for 6s. */
  .ann-text-wrapper:hover .ann-text,
  .ann-text-wrapper:focus-within .ann-text,
  .ann-text-wrapper.ann-paused .ann-text {
    animation-play-state: paused;
  }
  @keyframes ann-ticker {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100%);
    }
  }
  /* Shrink the visual close button on narrow screens but keep the hit
     area at 44x44 (WCAG 2.5.5 AAA). Transparent padding makes a finger-
     friendly tap target without making the button look visually heavy. */
  .ann-close {
    right: -10px;
    width: 44px;
    height: 44px;
    padding: 12px;
  }
  .ann-close svg {
    width: 11px;
    height: 11px;
  }
}

/* Mobile + reduced-motion: fall back to wrapping static text. Keep the
   badge visible here because wrapping text uses vertical space and the
   badge adds helpful context rather than competing for width. */
@media (max-width: 640px) and (prefers-reduced-motion: reduce) {
  .ann-text {
    white-space: normal;
  }
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
