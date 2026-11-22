import { slugify } from '../../scripts/resource-data.mjs';

export function categoryHeading(title) {
  const name = title.trim();
  return /\bresources$/i.test(name) ? name : `${name} Resources`;
}

export function resourceInCategory(resource, category) {
  return resource.categories.some(reference => reference.id === category.id) || resource.typeSlug === category.slug;
}

export function getCategoryDirectory(resources) {
  const categories = new Map();
  for (const resource of resources) {
    for (const category of resource.categories) categories.set(category.id, category);
    if (!resource.categories.length) categories.set('uncategorized', { id: 'uncategorized', title: 'Uncategorized' });
  }
  const directory = [...categories.values()].map(category => ({ ...category, slug: slugify(category.title) }));
  if (new Set(directory.map(category => category.slug)).size !== directory.length) throw new Error('Category URL collision');
  return directory.map(category => ({ ...category, count: resources.filter(resource => resourceInCategory(resource, category)).length }))
    .sort((left, right) => left.title.localeCompare(right.title));
}