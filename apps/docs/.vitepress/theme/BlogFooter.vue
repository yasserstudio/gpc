<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <aside class="blog-footer" aria-label="About GPC and the author">
    <div class="blog-footer-cta">
      <p class="blog-footer-title">Try GPC</p>
      <p class="blog-footer-text">
        Upload, roll out and monitor Android releases from your terminal or CI. One standalone
        binary, MIT-licensed, no telemetry.
      </p>
      <div class="language-bash blog-footer-code">
        <pre><code>brew install yasserstudio/tap/gpc</code></pre>
      </div>
      <p class="blog-footer-links">
        <a :href="withBase('/guide/quick-start')">Quick start</a>
        <a href="https://github.com/yasserstudio/gpc" target="_blank" rel="noopener"
          >Star on GitHub</a
        >
        <a :href="withBase('/blog/feed.xml')">RSS feed</a>
      </p>
    </div>
    <div class="blog-footer-author">
      <p class="blog-footer-name">Yasser Berrehail</p>
      <p class="blog-footer-role">Builds GPC at Yasser's Studio.</p>
      <p class="blog-footer-links">
        <a href="https://x.com/yassersstudio" target="_blank" rel="noopener">X</a>
        <a href="https://www.linkedin.com/in/yasserberrehail/" target="_blank" rel="noopener"
          >LinkedIn</a
        >
        <a href="mailto:support@yasser.studio">support@yasser.studio</a>
      </p>
    </div>
  </aside>
</template>

<style scoped>
.blog-footer {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

@media (min-width: 768px) {
  .blog-footer {
    grid-template-columns: 2fr 1fr;
  }
}

.blog-footer-cta,
.blog-footer-author {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.blog-footer p {
  margin: 0;
}

.blog-footer-title,
.blog-footer-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.blog-footer-text,
.blog-footer-role {
  margin-top: 6px !important;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.blog-footer-code {
  margin: 14px 0 0 !important;
}

.blog-footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 14px !important;
  font-size: 0.875rem;
}

.blog-footer-links a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.blog-footer-links a:hover {
  text-decoration: underline;
}
</style>
