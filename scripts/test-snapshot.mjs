import { normalizeBlogPost, normalizeResource } from './resource-data.mjs';
import { getCategoryDirectory } from '../src/data/categories.js';

const categories = getCategoryDirectory([]);
const paragraph = text => ({ nodes: [{ type: 'PARAGRAPH', nodes: [{ type: 'TEXT', textData: { text, decorations: [] } }] }] });
function resource(data, title) {
  const category = categories.find(category => category.title === title);
  return normalizeResource(data, category ? [{ id: category.id, title: category.title }] : []);
}

const resources = [
  resource({ _id: '5e58772c-ef16-4e98-9179-e9f91c12180b', title: 'All Aboard Ohio Rack Card: 50 Second Playbook to Improving Our State', shortTitle: 'All Aboard Ohio Rack Card', featured: true, studyInfo: paragraph('A printable advocacy resource.'), arraydocument: 'https://www.allaboardohio.org/_files/ugd/rack-card.pdf' }, 'Toolkit'),
  resource({ _id: '7e8ca1e5-912d-4000-a836-9d4af11ef44c', title: 'Economic Impact of the 3C+D Corridor Passenger Rail Project', featured: true, imagePreview: 'wix:image://v1/cb899b_a0a121dbaa374badb6eae24455ded1f7~mv2.png/preview.png' }, 'Onboarding'),
  resource({ _id: '84a1aa95-ecc9-4979-a528-c777cd95e09f', title: 'Ohio Runs on Rail Book', studyInfo: paragraph('A long-form rail resource.'), arraydocument: 'wix:document://v1/ugd/test-book.pdf/All%20Aboard%20Ohio%20Book.pdf' }, 'Analysis'),
  resource({ _id: 'a65bdd10-1df4-4e29-92b5-b6fb7177f3ef', title: 'About AAO Trifold Brochure', arraydocument: 'https://www.allaboardohio.org/_files/ugd/brochure.pdf' }, 'Templates'),
  resource({ _id: 'dde3ec9f-9dbf-401e-9c86-c2fe42261c28', title: 'Cincinnati Station Information', studyInfo: paragraph('Station information with an external destination.'), externalResourceLinks: 'https://www.amtrak.com/stations/cin' }),
];

const blogPosts = [
  { title: 'Toledo Takes Center Stage in National Rail Conversation', slug: 'toledo-takes-center-stage-in-national-rail-conversation', publishedDate: '2026-10-31T19:48:13Z' },
  { title: 'Cleveland Business Leaders Get on Board', slug: 'cleveland-business-leaders-get-on-board', publishedDate: '2026-10-31T19:14:32Z' },
  { title: 'Passenger Rail Research', slug: 'passenger-rail-research', publishedDate: '2026-10-21T20:56:51Z' },
].map((post, index) => normalizeBlogPost({ ...post, _id: `test-blog-${index}`, excerpt: 'Deterministic blog fixture, not live Wix content.', coverImage: 'wix:image://v1/test-cover.jpg/cover.jpg' }));

export default { version: 1, hash: 'test-only-snapshot', resources, blogPosts };