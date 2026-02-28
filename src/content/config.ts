import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['infrastructure', 'ai', 'cloud', 'local-ai', 'kotlin', 'snippets', 'career', 'automation']),
    tags: z.array(z.string()).optional(),
    situation: z.string().optional(),
    issue: z.string().optional(),
    solution: z.string().optional(),
    usedIn: z.string().optional(),
    impact: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts: postsCollection,
};
