import { defineCollection, z } from 'astro:content';

const bilingual = z.object({ en: z.string(), sl: z.string() });
const bilingualList = z.object({ en: z.array(z.string()), sl: z.array(z.string()) });

const services = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    order: z.number(),
    icon: z.string(),
    title: bilingual,
    short: bilingual,
    long: bilingual,
    deliverables: bilingualList,
    needs: bilingualList,
    paid: z.boolean().default(true)
  })
});

const projects = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    order: z.number().default(0),
    title: bilingual,
    date: z.string(),
    category: z.string(),
    clientType: z.string().optional(),
    short: bilingual,
    description: bilingual,
    details: bilingual.optional(),
    materials: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    photos: z.array(z.string()).default([]),
    cover: z.string().optional()
  })
});

const skills = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    order: z.number().default(0),
    title: bilingual,
    description: bilingual,
    items: z.array(z.string())
  })
});

const faq = defineCollection({
  type: 'data',
  schema: z.object({
    order: z.number().default(0),
    q: bilingual,
    a: bilingual
  })
});

export const collections = { services, projects, skills, faq };
