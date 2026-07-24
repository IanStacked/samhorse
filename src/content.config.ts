import fs from 'node:fs';
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob, type Loader } from 'astro/loaders';

// A collection with no entries yet warns via astro's glob loader if its base
// directory doesn't exist; gate those with a no-op loader until real content
// shows up, then the real glob loader takes over automatically.
const hasYaml = (dir: string) => fs.existsSync(dir) && fs.readdirSync(dir).some((f: string) => f.endsWith('.yaml'));

// getCollection() itself warns "does not exist or is empty" whenever the
// content store never registered the collection key, which a plain `() =>
// []` loader doesn't do. Registering then immediately removing a
// placeholder entry leaves the collection key present with zero entries,
// which is enough for getCollection() to return [] silently.
const emptyLoader: Loader = {
  name: 'empty-collection-loader',
  load: async ({ store }) => {
    store.set({ id: '__empty__', data: {} });
    store.delete('__empty__');
  },
};

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

// Shows — pure structured data. `horse` links to a horses entry for
// Samantha's own horses; `horseName` is a free-text fallback for a guest
// horse she rode that isn't in the Horses collection (never shown on the
// Horses page — that page only ever reads the `horse` relation). The
// content folder keeps its original name (`tournaments`) — only the
// user-facing label changed, so no entries need to move.
const shows = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/tournaments' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      date: z.coerce.date().optional(),
      location: z.string(),
      placement: z.string().optional(), // free text: "1st", "Reserve Champion", etc.
      rider: z.string().optional(),
      horse: reference('horses').optional(),
      horseName: z.string().optional(),
      photos: z.array(image()).optional(),
      videos: z.array(z.url()).optional(),
    }),
});

// Photos — gallery items, filterable by horse or year.
const photosDir = './src/content/photos';
const photos = defineCollection({
  loader: hasYaml(photosDir) ? glob({ pattern: '*.yaml', base: photosDir }) : emptyLoader,
  schema: ({ image }) =>
    z.object({
      image: image(),
      caption: z.string(),
      horse: reference('horses').optional(),
      year: z.number().int(),
      videos: z.array(z.url()).optional(),
    }),
});

// Accomplishments — standalone highlights, separate from show results.
const accomplishmentsDir = './src/content/accomplishments';
const accomplishments = defineCollection({
  loader: hasYaml(accomplishmentsDir) ? glob({ pattern: '*.yaml', base: accomplishmentsDir }) : emptyLoader,
  schema: ({ image }) =>
    z.object({
      class: z.string(), // the class competed in
      horse: reference('horses').optional(),
      position: z.string(),
      description: z.string(),
      photos: z.array(image()).optional(),
      videos: z.array(z.url()).optional(),
    }),
});

export const collections = { horses, shows, photos, accomplishments };
