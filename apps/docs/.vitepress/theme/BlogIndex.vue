<script setup lang="ts">
import { withBase } from "vitepress";
import { data as posts } from "../../blog/posts.data";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
</script>

<template>
  <div class="blog-index">
    <header class="blog-index-header">
      <h1 class="blog-index-title">Blog</h1>
      <p class="blog-index-lede">
        Engineering notes and guides on shipping Android releases to Google Play from the terminal
        and CI.
        <a :href="withBase('/blog/feed.xml')">RSS feed</a>
      </p>
    </header>
    <div v-for="post in posts" :key="post.url" class="blog-card">
      <a v-if="post.image" :href="withBase(post.url)" class="blog-card-cover" tabindex="-1">
        <img :src="withBase(post.image)" alt="" loading="lazy" width="1600" height="686" />
      </a>
      <a :href="withBase(post.url)" class="blog-card-link">
        <h2 class="blog-card-title">{{ post.title }}</h2>
      </a>
      <div class="blog-card-meta">
        <time :datetime="post.date">{{ formatDate(post.date) }}</time>
        <span v-if="post.author" class="blog-card-dot">{{ post.author }}</span>
        <span class="blog-card-dot">{{ post.readingMinutes }} min read</span>
      </div>
      <p class="blog-card-desc">{{ post.description }}</p>
      <div v-if="post.tags.length" class="blog-card-tags">
        <span v-for="tag in post.tags" :key="tag" class="blog-tag">{{ tag }}</span>
      </div>
    </div>
    <p v-if="posts.length === 0" class="blog-empty">No posts yet.</p>
  </div>
</template>

<style scoped>
.blog-index {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-index-header {
  padding: 48px 0 8px;
}

.blog-index-title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--vp-c-text-1);
}

.blog-index-lede {
  margin: 10px 0 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.blog-index-lede a {
  margin-left: 6px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.blog-index-lede a:hover {
  text-decoration: underline;
}

.blog-card {
  padding: 28px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.blog-card:last-child {
  border-bottom: none;
}

.blog-card-link {
  text-decoration: none;
  color: inherit;
}

.blog-card-title {
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  color: var(--vp-c-text-1);
  transition: color 0.15s ease;
}

.blog-card-link:hover .blog-card-title {
  color: var(--vp-c-brand-1);
}

.blog-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

.blog-card-cover {
  display: block;
  margin-bottom: 18px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background: #0b1a4a;
}

.blog-card-cover img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1600 / 686;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.blog-card-cover:hover img {
  transform: scale(1.02);
}

.blog-card-dot::before {
  content: "\00b7";
  margin-right: 12px;
}

.blog-card-desc {
  margin-top: 10px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.blog-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
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

.blog-empty {
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 48px 0;
}
</style>
