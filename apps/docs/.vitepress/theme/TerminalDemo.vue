<script setup lang="ts">
import { ref, onMounted } from "vue";

type LineType = "cmd" | "out" | "ok" | "warn" | "err" | "section" | "gap" | "divider";

interface Line {
  type: LineType;
  text?: string;
}

const props = withDefaults(
  defineProps<{
    lines: Line[];
    title?: string;
    delay?: number; // ms between lines
  }>(),
  { title: "terminal", delay: 180 },
);

const visible = ref<boolean[]>([]);

onMounted(() => {
  visible.value = props.lines.map(() => false);
  props.lines.forEach((_, i) => {
    setTimeout(
      () => {
        visible.value[i] = true;
      },
      400 + i * props.delay,
    );
  });
});
</script>

<template>
  <div class="td-window">
    <div class="td-header">
      <span class="td-dot td-red" />
      <span class="td-dot td-yellow" />
      <span class="td-dot td-green" />
      <span class="td-title">{{ title }}</span>
    </div>
    <div class="td-body">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="td-line"
        :class="[`td-type-${line.type}`, { 'td-visible': visible[i] }]"
      >
        <template v-if="line.type === 'cmd'">
          <span class="td-prompt">$</span>
          <span class="td-cmd-text">{{ line.text }}</span>
        </template>
        <template v-else-if="line.type === 'ok'">
          <span class="td-ok-icon">✓</span>
          <span class="td-ok-text">{{ line.text }}</span>
        </template>
        <template v-else-if="line.type === 'warn'">
          <span class="td-warn-icon">⚠</span>
          <span class="td-warn-text">{{ line.text }}</span>
        </template>
        <template v-else-if="line.type === 'err'">
          <span class="td-err-icon">✗</span>
          <span class="td-err-text">{{ line.text }}</span>
        </template>
        <template v-else-if="line.type === 'section'">
          <span class="td-section-text">{{ line.text }}</span>
        </template>
        <template v-else-if="line.type === 'divider'">
          <span class="td-divider-line">────────────────────────────</span>
        </template>
        <template v-else-if="line.type === 'out'">
          <span class="td-out-text">{{ line.text }}</span>
        </template>
        <!-- gap: empty -->
      </div>
      <div class="td-line td-cursor-line" :class="{ 'td-visible': visible[lines.length - 1] }">
        <span class="td-prompt">$</span>
        <span class="td-cursor">▋</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.td-window {
  background: #0d1117;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.3),
    0 16px 48px rgba(0, 0, 0, 0.4),
    0 0 40px rgba(77, 149, 241, 0.06);
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.82rem;
  overflow: hidden;
  margin: 24px 0;
}

.td-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #161b22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.td-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.td-red {
  background: #ff5f57;
}
.td-yellow {
  background: #febc2e;
}
.td-green {
  background: #28c840;
}

.td-title {
  margin-left: auto;
  font-family: "Inter", sans-serif;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.28);
  letter-spacing: 0.02em;
}

.td-body {
  padding: 16px 20px 20px;
  line-height: 1.9;
}

.td-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  min-height: 1.9em;
}

.td-line.td-visible {
  opacity: 1;
  transform: translateX(0);
}

.td-type-gap {
  min-height: 0.7em;
}

/* Tokens */
.td-prompt {
  color: #4d95f1;
  font-weight: 600;
  flex-shrink: 0;
}
.td-cmd-text {
  color: #e6edf3;
}
.td-ok-icon {
  color: #3fb950;
  flex-shrink: 0;
}
.td-ok-text {
  color: #8b949e;
}
.td-warn-icon {
  color: #d29922;
  flex-shrink: 0;
}
.td-warn-text {
  color: #d29922;
}
.td-err-icon {
  color: #f85149;
  flex-shrink: 0;
}
.td-err-text {
  color: #f85149;
}
.td-out-text {
  color: #8b949e;
}
.td-section-text {
  color: #e6edf3;
  font-weight: 600;
}
.td-divider-line {
  color: rgba(255, 255, 255, 0.08);
  font-size: 0.65rem;
}

.td-cursor-line {
  gap: 8px;
}
.td-cursor {
  color: #4d95f1;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
