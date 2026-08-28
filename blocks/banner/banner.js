import { createOptimizedPicture } from '../../scripts/aem.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';

/**
 * Returns true if the given string is a valid CSS color value.
 * @param {string} value the candidate color string
 * @returns {boolean}
 */
function isColor(value) {
  if (!value) return false;
  const option = new Option();
  option.style.color = '';
  option.style.color = value;
  return option.style.color !== '';
}

/**
 * Extracts trimmed text lines from an element, ignoring any images. Each
 * paragraph is treated as its own line, and <br> within a paragraph splits
 * further. This handles the color authored as a separate <p>, on a new line
 * within one <p> (via <br>), or content spread across multiple cells.
 * @param {Element} el the element to read
 * @returns {string[]}
 */
function textLines(el) {
  const paragraphs = el.querySelectorAll('p');
  const sources = paragraphs.length ? [...paragraphs] : [el];
  const lines = [];
  sources.forEach((source) => {
    source.innerHTML.split(/<br\s*\/?>/i).forEach((part) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = part;
      tmp.querySelectorAll('picture, img').forEach((node) => node.remove());
      const text = tmp.textContent.trim();
      if (text) lines.push(text);
    });
  });
  return lines;
}

/**
 * loads and decorates the banner
 * @param {Element} block The banner block element
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const img = picture?.querySelector('img');

  // Gather all authored text lines, then split them into a title and an
  // optional background color. Fields may be authored in any order.
  const lines = [...block.children].flatMap((row) => textLines(row));
  let backgroundColor;
  const titleParts = [];
  lines.forEach((line) => {
    if (!backgroundColor && isColor(line)) {
      backgroundColor = line;
    } else {
      titleParts.push(line);
    }
  });

  // Only apply an authored color for the default variant. The dark variant is
  // always dark, so an authored color is ignored there. The CSS owns the
  // defaults (blue for default, dark for dark) so class rules aren't overridden.
  if (backgroundColor && !block.classList.contains('dark')) {
    block.style.setProperty('--banner-background-color', backgroundColor);
  }

  // Build the final structure.
  block.textContent = '';

  if (picture) {
    const optimized = img
      ? createOptimizedPicture(img.src, img.alt, false, [{ width: '2000' }])
      : picture;
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'banner-image';
    imageWrapper.append(optimized);
    block.append(imageWrapper);
  }

  const title = titleParts.join(' ');
  if (title) {
    const content = document.createElement('div');
    content.className = 'banner-content';
    const heading = document.createElement('h2');
    heading.textContent = title;
    content.append(heading);
    block.append(content);
    // fetch placeholders from the 'en' folder
    const placeholders = await fetchPlaceholders('en');
    // retrieve the value for key 'foo'
    const bannerPlaceholder = placeholders['banner-title'];
    const placeholderDiv = document.createElement('div');
    placeholderDiv.className = 'banner-placeholder';
    placeholderDiv.append(bannerPlaceholder);
    block.append(placeholderDiv);
  }
}
