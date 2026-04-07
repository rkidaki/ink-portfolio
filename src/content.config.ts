import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const poetry = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/poetry' }),
  schema: z.object({
    title: z.string(),
    enTitle: z.string().optional(),
    date: z.string().optional(),
  }),
});

// Fiction stories: one _meta.md per story folder.
// Entry id is the folder name (e.g. "romance-as-enlightenment").
const fiction = defineCollection({
  loader: glob({
    pattern: '*/_meta.md',
    base: './src/content/fiction',
    generateId: ({ entry }) => entry.replace(/\/_meta\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    enTitle: z.string().optional(),
    date: z.string().optional(),
    quoteLine1: z.string().optional(),
    quoteLine2: z.string().optional(),
    quoteSource: z.string().optional(),
  }),
});

// Fiction chapters: one ch-*.md per chapter inside a story folder.
// Entry id is "story-slug/ch-1", etc.
const fictionChapters = defineCollection({
  loader: glob({
    pattern: '*/ch-*.md',
    base: './src/content/fiction',
  }),
  schema: z.object({
    title: z.string(),
    enTitle: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { poetry, fiction, fictionChapters };
