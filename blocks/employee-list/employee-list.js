import { fetchPlaceholders } from '../../scripts/placeholders.js';

const PAGE_SIZE = 10;
const COLUMNS = ['Name', 'Department', 'Experience', 'City'];

/**
 * Fetches one page of employees.
 * @param {string} source the spreadsheet JSON URL
 * @param {number} offset the number of employees already loaded
 * @returns {Promise<object>} the employee response
 */
async function fetchEmployees(source, offset) {
  const url = new URL(source, window.location.href);
  url.searchParams.set('limit', PAGE_SIZE);
  url.searchParams.set('offset', offset);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Employee request failed with status ${response.status}`);

  const json = await response.json();
  if (!Array.isArray(json.data)) throw new Error('Employee response is missing data');
  return json;
}

/**
 * Creates the employee table.
 * @returns {{ table: HTMLTableElement, body: HTMLTableSectionElement }} table elements
 */
function createTable() {
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Employee list';
  table.append(caption);

  const head = document.createElement('thead');
  const headingRow = document.createElement('tr');
  COLUMNS.forEach((column) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.textContent = column;
    headingRow.append(heading);
  });
  head.append(headingRow);
  table.append(head);

  const body = document.createElement('tbody');
  table.append(body);
  return { table, body };
}

/**
 * Appends employee records to the table body.
 * @param {HTMLTableSectionElement} body the table body
 * @param {object[]} employees employee records
 */
function appendEmployees(body, employees) {
  employees.forEach((employee) => {
    const row = document.createElement('tr');
    COLUMNS.forEach((column) => {
      const cell = document.createElement('td');
      cell.dataset.label = column;
      cell.textContent = employee[column] ?? '';
      row.append(cell);
    });
    body.append(row);
  });
}

/**
 * Loads and decorates the employee list block.
 * @param {Element} block the employee list block
 */
export default async function decorate(block) {
  const source = block.querySelector('a[href]')?.href;
  block.textContent = '';

  const error = document.createElement('p');
  error.className = 'employee-list-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;

  if (!source) {
    error.textContent = 'The employee list is currently unavailable.';
    error.hidden = false;
    block.append(error);
    return;
  }

  const tableRegion = document.createElement('div');
  tableRegion.className = 'employee-list-table';
  tableRegion.setAttribute('tabindex', '0');
  tableRegion.setAttribute('role', 'region');
  tableRegion.setAttribute('aria-label', 'Employee list');

  const { table, body } = createTable();
  tableRegion.append(table);

  const loadMore = document.createElement('button');
  loadMore.className = 'button primary employee-list-load-more';
  loadMore.type = 'button';
  loadMore.textContent = 'Load More Employees';
  loadMore.hidden = true;

  block.append(tableRegion, error, loadMore);

  let employeeCount = 0;
  let total = 0;
  let isLoading = false;

  const loadEmployees = async () => {
    if (isLoading) return;

    isLoading = true;
    error.hidden = true;
    loadMore.disabled = true;
    block.setAttribute('aria-busy', 'true');

    try {
      const json = await fetchEmployees(source, employeeCount);
      appendEmployees(body, json.data);
      employeeCount += json.data.length;
      total = Number.isFinite(Number(json.total)) ? Number(json.total) : employeeCount;
      loadMore.hidden = json.data.length < PAGE_SIZE || employeeCount >= total;
    } catch {
      error.textContent = 'We could not load the employee list. Please try again.';
      error.hidden = false;
      loadMore.hidden = employeeCount === 0;
    } finally {
      isLoading = false;
      loadMore.disabled = false;
      block.removeAttribute('aria-busy');
    }
  };

  loadMore.addEventListener('click', loadEmployees);

  const [placeholders] = await Promise.all([
    fetchPlaceholders(),
    loadEmployees(),
  ]);
  loadMore.textContent = placeholders.loadMoreEmployees || 'Load More Employees';
}
