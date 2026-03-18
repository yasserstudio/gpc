<script setup lang="ts">
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";

const { Layout } = DefaultTheme;
const { page } = useData();

const isHome = () => page.value.frontmatter.layout === "home";
</script>

<template>
  <Layout>
    <template #home-hero-image>
      <div v-if="isHome()" class="terminal-window" aria-hidden="true">
        <div class="terminal-header">
          <span class="dot dot-red" />
          <span class="dot dot-yellow" />
          <span class="dot dot-green" />
          <span class="terminal-title">terminal</span>
        </div>
        <div class="terminal-body">
          <div class="t-line delay-1"><span class="t-prompt">$</span> <span class="t-cmd">gpc status</span></div>
          <div class="t-line delay-2 t-spacer" />
          <div class="t-line delay-2"><span class="t-section">App Health</span> <span class="t-dim">· com.example.app</span></div>
          <div class="t-line delay-2 t-divider">────────────────────────────</div>
          <div class="t-line delay-3 t-spacer" />
          <div class="t-line delay-3"><span class="t-label">Releases</span></div>
          <div class="t-line delay-4">  <span class="t-ok">✓</span> <span class="t-dim">production</span>  <span class="t-val">v2.4.1</span>  <span class="t-muted">100% rollout</span></div>
          <div class="t-line delay-5">  <span class="t-ok">✓</span> <span class="t-dim">beta</span>        <span class="t-val">v2.5.0</span>  <span class="t-muted">20% staged</span></div>
          <div class="t-line delay-5 t-spacer" />
          <div class="t-line delay-6"><span class="t-label">Vitals</span></div>
          <div class="t-line delay-7">  <span class="t-ok">✓</span> <span class="t-dim">crash rate</span>   <span class="t-val">0.08%</span>  <span class="t-good">↓ improving</span></div>
          <div class="t-line delay-8">  <span class="t-ok">✓</span> <span class="t-dim">ANR rate</span>     <span class="t-val">0.01%</span>  <span class="t-muted">stable</span></div>
          <div class="t-line delay-9">  <span class="t-warn">⚠</span> <span class="t-dim">cold start</span>   <span class="t-val">842ms</span>  <span class="t-warning">↑ watch</span></div>
          <div class="t-line delay-9 t-spacer" />
          <div class="t-line delay-10"><span class="t-label">Reviews</span> <span class="t-muted">(last 7d)</span></div>
          <div class="t-line delay-11">  <span class="t-stars">★★★★★</span>  <span class="t-val">4.6</span>  <span class="t-dim">│</span>  <span class="t-muted">+23 new</span></div>
          <div class="t-line delay-12 t-spacer" />
          <div class="t-line delay-12"><span class="t-prompt">$</span> <span class="t-cursor">▋</span></div>
        </div>
      </div>
    </template>
  </Layout>
</template>

<style scoped>
.terminal-window {
  width: 420px;
  background: #0d1117;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.4),
    0 24px 80px rgba(0, 0, 0, 0.5),
    0 0 60px rgba(77, 149, 241, 0.08);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.78rem;
  overflow: hidden;
  animation: terminalFadeIn 0.8s 0.3s ease both;
}

@keyframes terminalFadeIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 14px;
  background: #161b22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot-red    { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green  { background: #28c840; }

.terminal-title {
  margin-left: auto;
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.02em;
}

.terminal-body {
  padding: 18px 20px 20px;
  line-height: 1.8;
}

.t-line {
  display: block;
  white-space: pre;
  opacity: 0;
  animation: lineIn 0.3s ease forwards;
}

.t-spacer { height: 6px; }

.t-divider {
  color: rgba(255, 255, 255, 0.1);
  font-size: 0.65rem;
}

/* Staggered line delays */
.delay-1  { animation-delay: 0.5s; }
.delay-2  { animation-delay: 0.65s; }
.delay-3  { animation-delay: 0.85s; }
.delay-4  { animation-delay: 1.0s; }
.delay-5  { animation-delay: 1.15s; }
.delay-6  { animation-delay: 1.35s; }
.delay-7  { animation-delay: 1.5s; }
.delay-8  { animation-delay: 1.65s; }
.delay-9  { animation-delay: 1.8s; }
.delay-10 { animation-delay: 2.0s; }
.delay-11 { animation-delay: 2.15s; }
.delay-12 { animation-delay: 2.3s; }

@keyframes lineIn {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Token colors */
.t-prompt  { color: #4d95f1; font-weight: 600; }
.t-cmd     { color: #e6edf3; font-weight: 500; }
.t-section { color: #e6edf3; font-weight: 700; }
.t-label   { color: #7ee787; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
.t-ok      { color: #3fb950; }
.t-warn    { color: #d29922; }
.t-val     { color: #79c0ff; }
.t-good    { color: #3fb950; }
.t-warning { color: #d29922; }
.t-dim     { color: #8b949e; }
.t-muted   { color: #484f58; }
.t-stars   { color: #d29922; letter-spacing: 1px; }
.t-cursor  { color: #4d95f1; animation: blink 1s step-end infinite; animation-delay: 2.5s; opacity: 0; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* Light mode: keep terminal always dark */
:global(.VPHero .image-container) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
