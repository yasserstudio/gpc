<script setup lang="ts">
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";

const { Layout } = DefaultTheme;
const { isDark, page } = useData();
</script>

<template>
  <Layout>
    <!-- Ambient terminal glow — dark home page only -->
    <template #layout-top>
      <div
        v-if="isDark && page.frontmatter.layout === 'home'"
        class="gpc-ambient"
        aria-hidden="true"
      />
    </template>
  </Layout>
</template>

<style scoped>
.gpc-ambient {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(1100px, 100%);
  height: 480px;
  background: radial-gradient(
    ellipse 70% 100% at 50% 0%,
    rgba(77, 149, 241, 0.07) 0%,
    transparent 72%
  );
  pointer-events: none;
  z-index: 0;
  animation: ambientFade 1.2s ease both;
}

@keyframes ambientFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
