<script setup lang="ts">
import { useData } from "vitepress";

const { frontmatter } = useData();

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
</script>

<template>
  <div class="blog-post-header">
    <a href="/gpc/blog/" class="blog-back">&larr; All posts</a>
    <div class="blog-post-meta">
      <time
        v-if="frontmatter.date"
        :datetime="new Date(frontmatter.date).toISOString().slice(0, 10)"
      >
        {{ formatDate(new Date(frontmatter.date).toISOString().slice(0, 10)) }}
      </time>
      <span v-if="frontmatter.author" class="blog-post-author">{{ frontmatter.author }}</span>
    </div>
    <div v-if="frontmatter.tags?.length" class="blog-post-tags">
      <span v-for="tag in frontmatter.tags" :key="tag" class="blog-tag">{{ tag }}</span>
    </div>
  </div>
</template>

<style scoped>
.blog-post-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.blog-back {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.15s ease;
}

.blog-back:hover {
  color: var(--vp-c-brand-2);
}

.blog-post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

.blog-post-author::before {
  content: "\00b7";
  margin-right: 12px;
}

.blog-post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.blog-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 12px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}
</style>
