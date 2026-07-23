import fs from 'node:fs';
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Horses — bio lives in the markdown body; frontmatter holds the structured data.
const horses = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/horses' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      breed: z.string(),
      discipline: z.string(),
      foaled: z.number().int(), // birth year; age is computed in the UI
      photo: image(),
    }),
});

// Tournaments — pure structured data. `horse` links to a horses entry.
const tournaments = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/tournaments' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      date: z.coerce.date(),
      location: z.string(),
      placement: z.string(), // free text: "1st", "Reserve Champion", etc.
      horse: reference('horses'),
      photos: z.array(image()).optional(),
    }),
});

// Photos — gallery items, filterable by horse or year. No entries yet, and
// astro's glob loader warns if the base directory doesn't exist; gate it so
// the collection stays silent until real content shows up.
const photosDir = './src/content/photos';
const hasPhotos = fs.existsSync(photosDir) && fs.readdirSync(photosDir).some((f: string) => f.endsWith('.yaml'));

const photos = defineCollection({
  loader: hasPhotos ? glob({ pattern: '*.yaml', base: photosDir }) : () => [],
  schema: ({ image }) =>
    z.object({
      image: image(),
      caption: z.string(),
      horse: reference('horses').optional(),
      year: z.number().int(),
    }),
});

export const collections = { horses, tournaments, photos };
