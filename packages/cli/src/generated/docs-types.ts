export interface DocPage {
  slug: string;
  section: string;
  title: string;
  description: string;
  content: string;
}

export interface SearchEntry {
  slug: string;
  score: number;
}

export interface DocsBundle {
  generatedAt: string;
  pageCount: number;
  pages: DocPage[];
  searchIndex: Record<string, SearchEntry[]>;
}
