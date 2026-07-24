import type { ImageMetadata } from 'astro';

export interface ShowItem {
  id: string;
  name: string;
  date?: Date;
  location: string;
  placement?: string;
  rider?: string;
  horseId?: string; // present only when the `horse` relation resolved
  horseName?: string; // resolved relation name, or the free-text fallback
  videos?: string[];
}

export interface PhotoItem {
  image: ImageMetadata;
  caption: string;
  year: number;
  horseId?: string;
  horseName?: string;
  videos?: string[];
}

export interface AccomplishmentItem {
  id: string;
  class: string;
  position: string;
  description: string;
  horseId?: string;
  horseName?: string;
  photos?: ImageMetadata[];
  videos?: string[];
}
