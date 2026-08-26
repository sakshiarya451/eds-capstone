import { getMetadata } from '../../scripts/aem.js';

/**
 * Converts a URL path segment into a human-readable label,
 * e.g. "my-new-page" -> "My New Page".
 * @param {string} segment the path segment
 * @returns {string}
 */
function humanize(segment) {
  return decodeURIComponent(segment)
    .replace(/\.[^.]+$/, '') // drop any file extension
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Builds the breadcrumb trail dynamically from the current URL path.
 * The last crumb uses the page title (og:title) when available.
 * @returns {{text: string, link?: string}[]}
 */
function buildTrail() {
  const trail = [{ text: 'Home', link: '/' }];
  const segments = window.location.pathname.split('/').filter(Boolean);

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const link = `/${segments.slice(0, index + 1).join('/')}`;
    const text = isLast ? (getMetadata('og:title') || humanize(segment)) : humanize(segment);
    // The current page (last crumb) has no link.
    trail.push(isLast ? { text } : { text, link });
  });

  return trail;
}

/**
 * loads and decorates the breadcrumb
 * @param {HTMLElement} $block The breadcrumb block element
 */
export default function decorate($block) {
  const $ul = document.createElement('ul');
  $block.append($ul);

  const trail = buildTrail();
  trail.forEach((step) => {
    const $li = document.createElement('li');
    $ul.append($li);
    let $wrap = $li;
    if (step.link) {
      $wrap = document.createElement('a');
      $wrap.href = step.link;
      $li.append($wrap);
    }
    const $span = document.createElement('span');
    $wrap.append($span);
    $span.textContent = step.text;
  });
}
