import { getCollection, type CollectionEntry } from 'astro:content';

export type Projekt = CollectionEntry<'projekte'>;

/** Alle veröffentlichten Projekte, sortiert nach "reihenfolge", dann nach Jahr (neueste zuerst). */
export async function getProjekte(): Promise<Projekt[]> {
  const alle = await getCollection('projekte', (p) => import.meta.env.DEV || !p.data.entwurf);
  return alle.sort(
    (a, b) => a.data.reihenfolge - b.data.reihenfolge || String(b.data.jahr ?? '').localeCompare(String(a.data.jahr ?? '')),
  );
}

/** Vorhandene Kategorien in fester Reihenfolge, nur die, die auch Projekte haben. */
export function genutzteKategorien(projekte: Projekt[]) {
  const set = new Set(projekte.flatMap((p) => p.data.kategorien));
  return (['sport', 'motorsport', 'tv', 'kunst', 'social'] as const).filter((k) => set.has(k));
}
