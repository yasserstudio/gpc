<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    command?: string;
  }>(),
  { title: "terminal" },
);
</script>

<template>
  <div class="to-window">
    <div class="to-header">
      <div class="to-dots">
        <span class="to-dot to-red" />
        <span class="to-dot to-yellow" />
        <span class="to-dot to-green" />
      </div>
      <span class="to-title">{{ title }}</span>
    </div>
    <div class="to-body">
      <div v-if="command" class="to-command">
        <span class="to-prompt">$</span>
        <span class="to-cmd-text">{{ command }}</span>
      </div>
      <div class="to-output">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.to-window {
  background: #0d1117;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.3);
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.82rem;
  overflow: hidden;
  margin: 24px 0;
}

.to-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: #161b22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: nowrap;
}

.to-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.to-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.to-red {
  background: #ff5f57;
}
.to-yellow {
  background: #febc2e;
}
.to-green {
  background: #28c840;
}

.to-title {
  font-family: "Inter", sans-serif;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.28);
  letter-spacing: 0.02em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

@media (max-width: 420px) {
  .to-title {
    display: none;
  }
}

.to-body {
  padding: 16px 20px 20px;
  line-height: 1.85;
}

.to-command {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  color: #e6edf3;
}

.to-prompt {
  color: #4d95f1;
  font-weight: 600;
  flex-shrink: 0;
}
.to-cmd-text {
  color: #e6edf3;
}

.to-output {
  color: #8b949e;
  white-space: pre;
}

/* Slot content token classes — usable inside <TerminalOutput> */
:slotted(.ok) {
  color: #3fb950;
}
:slotted(.warn) {
  color: #d29922;
}
:slotted(.err) {
  color: #f85149;
}
:slotted(.val) {
  color: #79c0ff;
}
:slotted(.dim) {
  color: #484f58;
}
:slotted(.label) {
  color: #7ee787;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
:slotted(.stars) {
  color: #d29922;
  letter-spacing: 1px;
}
</style>
