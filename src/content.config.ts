import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    rank: z.number().optional(), // lower shows first; unranked entries follow, newest first
    kind: z.enum(['project', 'research']).default('project'),
    liveUrl: z.url().optional(),
    repoUrl: z.url().optional(),
    pdfUrl: z.string().regex(/^\/assets\/docs\/[\w.-]+\.pdf$/).optional(),
  }),
});

export const collections = { projects };
