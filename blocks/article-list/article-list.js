import { createOptimizedPicture } from '../../scripts/aem.js';

// Fragment/utility paths that should never appear as articles.
const EXCLUDED_PATHS = ['/nav', '/footer'];

/**
 * Reads the block configuration from the authored content.
 * Supported (all optional):
 *  - a path prefix to filter by (e.g. "/blog/")
 *  - a numeric limit of items to show
 * @param {Element} block the article-list block
 * @returns {{ prefix: string, limit: number }}
 */
function readConfig(block) {
  let prefix = '';
  let limit = 0;
  [...block.children].forEach((row) => {
    const text = row.textContent.trim();
    if (!text) return;
    if (/^\d+$/.test(text)) {
      limit = Number(text);
    } else if (text.startsWith('/')) {
      prefix = text;
    }
  });
  return { prefix, limit };
}

/**
 * Fetches the site index.
 * @returns {Promise<object[]>} the index rows
 */
async function fetchIndex() {
  const response = await fetch('/query-index.json');
  if (!response.ok) throw new Error(`Index request failed with status ${response.status}`);
  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * Builds a single article card.
 * @param {object} item an index row
 * @returns {HTMLLIElement}
 */
function createCard(item) {
  const li = document.createElement('li');
  li.className = 'article-card';

  const link = document.createElement('a');
  link.href = item.path;

  if (item.image) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'article-card-image';
    imageWrapper.append(createOptimizedPicture(item.image, item.title || '', false, [{ width: '750' }]));
    link.append(imageWrapper);
  }

  const body = document.createElement('div');
  body.className = 'article-card-body';

  if (item.title) {
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    body.append(heading);
  }
  if (item.description) {
    const description = document.createElement('p');
    description.textContent = item.description;
    body.append(description);
  }

  link.append(body);
  li.append(link);
  return li;
}

/**
 * Loads and decorates the article list block.
 * @param {Element} block the article-list block
 */
export default async function decorate(block) {
  const { prefix, limit } = readConfig(block);
  block.textContent = '';

  const list = document.createElement('ul');
  list.className = 'article-list-items';

  try {
    let items = await fetchIndex();

    // Only real content pages: drop fragments and any current-page self-link.
    items = items.filter((item) => item.path
      && !EXCLUDED_PATHS.includes(item.path)
      && item.path !== window.location.pathname
      && (!prefix || item.path.startsWith(prefix)));

    // Newest first when a date is available.
    items.sort((a, b) => Number(b.date || 0) - Number(a.date || 0));

    if (limit > 0) items = items.slice(0, limit);

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'article-list-empty';
      empty.textContent = 'No articles found.';
      block.append(empty);
      return;
    }

    items.forEach((item) => list.append(createCard(item)));
    block.append(list);
  } catch {
    const error = document.createElement('p');
    error.className = 'article-list-error';
    error.setAttribute('role', 'alert');
    error.textContent = 'We could not load the article list. Please try again later.';
    block.append(error);
  }
}
