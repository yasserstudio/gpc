import { createContentLoader } from "vitepress";

export interface Post {
  title: string;
  url: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  image: string;
  readingMinutes: number;
}

export default createContentLoader("blog/*.md", {
  excerpt: false,
  includeSrc: true,
  transform(raw): Post[] {
    return raw
      .filter((page) => page.url !== "/blog/")
      .map((page) => ({
        title: page.frontmatter.title ?? "Untitled",
        url: /^\/[^/]/.test(page.url) ? page.url : "/",
        date: (() => {
          try {
            return page.frontmatter.date
              ? new Date(page.frontmatter.date).toISOString().slice(0, 10)
              : "";
          } catch {
            return "";
          }
        })(),
        description: page.frontmatter.description ?? "",
        author: page.frontmatter.author ?? "Yasser Berrehail",
        tags: page.frontmatter.tags ?? [],
        image: page.frontmatter.image ?? "",
        // ~230 words a minute for technical prose; frontmatter and code count too,
        // which is close enough for a list badge.
        readingMinutes: Math.max(1, Math.round((page.src ?? "").split(/\s+/).length / 230)),
      }))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  },
});
