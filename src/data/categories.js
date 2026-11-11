import { slugify } from '../../scripts/resource-data.mjs';

const knownCategories = [
  { id: '65bf1934-b070-4e34-8a61-a6870946ba7b', title: 'Analysis' },
  { id: 'c26ab23a-e83c-4824-aaef-dc92438e5d62', title: 'Onboarding' },
  { id: '529c5287-bd31-4c97-a4c5-61598ab909e2', title: 'Printables' },
  { id: '7d822588-340e-4e17-b3e4-f1adb4e118c3', title: 'Templates' },
  { id: 'a61f9f89-576b-4d18-8b4e-cb1952fe382a', title: 'Toolkit' },
];

export function resourceInCategory(resource, category) {
  return resource.categories.some(reference => reference.id === category.id) || resource.typeSlug === category.slug;
}

export function getCategoryDirectory(resources) {
  const categories = new Map(knownCategories.map(category => [category.id, category]));
  for (const resource of resources) {
    for (const category of resource.categories) categories.set(category.id, category);
    if (!resource.categories.length) categories.set('uncategorized', { id: 'uncategorized', title: 'Uncategorized' });
  }
  const directory = [...categories.values()].map(category => ({ ...category, slug: slugify(category.title) }));
  if (new Set(directory.map(category => category.slug)).size !== directory.length) throw new Error('Category URL collision');
  return directory.map(category => ({ ...category, count: resources.filter(resource => resourceInCategory(resource, category)).length }))
    .sort((left, right) => left.title.localeCompare(right.title));
}