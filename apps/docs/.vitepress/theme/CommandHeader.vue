<script setup lang="ts">
defineProps<{
  name: string;
  description: string;
  usage?: string;
  badges?: string[];
}>();
</script>

<template>
  <div class="ch-wrap">
    <div class="ch-top">
      <div class="ch-prompt">
        <span class="ch-dollar">$</span>
        <span class="ch-name">{{ name }}</span>
      </div>
      <div v-if="badges?.length" class="ch-badges">
        <span v-for="b in badges" :key="b" class="ch-badge">{{ b }}</span>
      </div>
    </div>
    <p class="ch-desc">{{ description }}</p>
    <div v-if="usage" class="ch-usage">
      <span class="ch-usage-label">usage</span>
      <code class="ch-usage-code">{{ usage }}</code>
    </div>
  </div>
</template>

<style scoped>
.ch-wrap {
  background: #0d1117;
  border: 1px solid rgba(77, 149, 241, 0.18);
  border-radius: 10px;
  padding: 22px 24px 20px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}

.ch-wrap::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1a73e8 0%, #4d95f1 50%, #8fbdf7 100%);
}

.ch-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.ch-prompt {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ch-dollar {
  color: #4d95f1;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.ch-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e6edf3;
  letter-spacing: -0.01em;
}

.ch-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ch-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(77, 149, 241, 0.12);
  border: 1px solid rgba(77, 149, 241, 0.22);
  color: #79c0ff;
  white-space: nowrap;
}

.ch-desc {
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: #8b949e;
  line-height: 1.6;
  margin: 0 0 14px;
}

.ch-usage {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 8px 12px;
}

.ch-usage-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #484f58;
  flex-shrink: 0;
}

.ch-usage-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: #79c0ff;
  background: none;
  border: none;
  padding: 0;
}
</style>
