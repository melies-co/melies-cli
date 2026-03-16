import actorsData from '../data/actors.json';

export interface Actor {
  name: string;
  id: string;
  modifier: string;
  r2Url: string;
  gender: string;
  ageGroup: string;
  type: string;
  tags: string[];
}

const actors: Actor[] = actorsData as Actor[];

export function findActor(name: string): Actor | null {
  const lower = name.toLowerCase();
  return actors.find((a) => a.name.toLowerCase() === lower || a.id.toLowerCase() === lower) || null;
}

export function searchActors(query: string): Actor[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return actors.filter((a) => {
    const searchable = [
      a.name.toLowerCase(),
      a.id.toLowerCase(),
      a.type.toLowerCase(),
      a.gender.toLowerCase(),
      a.ageGroup.toLowerCase(),
      ...a.tags.map((t) => t.toLowerCase()),
    ].join(' ');
    return words.every((word) => searchable.includes(word));
  });
}

export function filterActors(options: { type?: string; gender?: string; age?: string }): Actor[] {
  let result = actors;
  if (options.type) {
    const lower = options.type.toLowerCase();
    result = result.filter((a) => a.type.toLowerCase() === lower);
  }
  if (options.gender) {
    const lower = options.gender.toLowerCase();
    result = result.filter((a) => a.gender.toLowerCase() === lower);
  }
  if (options.age) {
    const lower = options.age.toLowerCase();
    result = result.filter((a) => a.ageGroup.toLowerCase() === lower);
  }
  return result;
}

export function getAllActors(): Actor[] {
  return actors;
}
