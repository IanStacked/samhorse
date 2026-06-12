import type { ImageMetadata } from 'astro';

export interface TournamentItem {
  id: string;
  name: string;
  date: Date;
  location: string;
  placement: string;
  horseId?: string;
  horseName?: string;
}

export interface PhotoItem {
  image: ImageMetadata;
  caption: string;
  year: number;
  horseId?: string;
  horseName?: string;
}
