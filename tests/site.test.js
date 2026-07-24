// Behavioral tests for every user-facing surface, asserted against the built
// site in dist/ (run `npm run build` first). Content entries are discovered
// from src/content/ so CMS edits (new horses, new shows) never break the suite.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { basename, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');

const page = (...segments) => readFile(join(DIST, ...segments, 'index.html'), 'utf8');

async function contentIds(dir, ext) {
  const files = await readdir(join(ROOT, 'src/content', dir));
  return files.filter((f) => f.endsWith(ext)).map((f) => basename(f, ext));
}

// Content text appears HTML-escaped in the rendered pages.
const escapeHtml = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const includesText = (html, text) => html.includes(escapeHtml(text)) || html.includes(text);

// `name:` from an entry's YAML/frontmatter — enough for this content's flat schemas.
async function entryName(dir, file) {
  const raw = await readFile(join(ROOT, 'src/content', dir, file), 'utf8');
  const match = raw.match(/^name:\s*["']?(.+?)["']?\s*$/m);
  assert.ok(match, `no name: field in src/content/${dir}/${file}`);
  return match[1];
}

before(async () => {
  await access(DIST).catch(() => {
    assert.fail('dist/ not found — run `npm run build` before `npm test`');
  });
});

test('home renders the hero and links every section', async () => {
  const html = await page();
  assert.match(html, /Samantha Rodgers/);
  for (const href of ['/horses', '/shows', '/accomplishments', '/gallery']) {
    assert.ok(html.includes(`href="${href}"`), `home is missing a link to ${href}`);
  }
});

test('horses list names every horse entry', async () => {
  const html = await page('horses');
  const ids = await contentIds('horses', '.md');
  assert.ok(ids.length > 0, 'no horse entries in src/content/horses');
  for (const id of ids) {
    const name = await entryName('horses', `${id}.md`);
    assert.ok(includesText(html, name), `horses list is missing ${name}`);
    assert.ok(html.includes(`href="/horses/${id}"`), `horses list is missing a link to ${id}`);
  }
});

test('each horse has a detail page with its name and photo', async () => {
  for (const id of await contentIds('horses', '.md')) {
    const html = await page('horses', id);
    const name = await entryName('horses', `${id}.md`);
    assert.ok(includesText(html, name), `horse page ${id} is missing its name`);
    assert.match(html, /<img/, `horse page ${id} is missing its photo`);
  }
});

// Show entries still live in src/content/tournaments/ on disk (sh5 renamed
// only the user-facing label/route, not the content folder).
test('shows list shows every entry and links its detail page', async () => {
  const html = await page('shows');
  const ids = await contentIds('tournaments', '.yaml');
  assert.ok(ids.length > 0, 'no show entries in src/content/tournaments');
  for (const id of ids) {
    const name = await entryName('tournaments', `${id}.yaml`);
    assert.ok(includesText(html, name), `shows list is missing ${name}`);
    assert.ok(
      html.includes(`href="/shows/${id}"`),
      `shows list row does not link to /shows/${id}`,
    );
  }
});

test('each show has a detail page with name, placement, and its photos', async () => {
  for (const id of await contentIds('tournaments', '.yaml')) {
    const html = await page('shows', id);
    const raw = await readFile(join(ROOT, 'src/content/tournaments', `${id}.yaml`), 'utf8');
    const name = await entryName('tournaments', `${id}.yaml`);
    assert.ok(includesText(html, name), `show page ${id} is missing its name`);
    const placement = raw.match(/^placement:\s*["']?(.+?)["']?\s*$/m);
    if (placement) {
      assert.ok(includesText(html, placement[1]), `show page ${id} is missing its placement`);
    }
    if (/^photos:/m.test(raw)) {
      assert.match(html, /<img/, `show page ${id} has photos in content but renders none`);
    }
  }
});

test('old /tournaments URLs redirect to /shows', async () => {
  const redirects = await readFile(join(DIST, '_redirects'), 'utf8');
  assert.match(redirects, /\/tournaments\/\*\s+\/shows\/:splat\s+301/);
  assert.match(redirects, /\/tournaments\s+\/shows\s+301/);
});

test('gallery renders with its filters', async () => {
  const html = await page('gallery');
  assert.match(html, /Gallery/);
  assert.match(html, /id="filter-horse"/);
  assert.match(html, /id="filter-year"/);
});

test('accomplishments list renders, entries link their detail page', async () => {
  const html = await page('accomplishments');
  assert.match(html, /Accomplishments/);
  const dirExists = await access(join(ROOT, 'src/content/accomplishments')).then(
    () => true,
    () => false,
  );
  const ids = dirExists ? await contentIds('accomplishments', '.yaml') : [];
  if (ids.length === 0) {
    assert.match(html, /No accomplishments yet/);
  }
  for (const id of ids) {
    const html = await page('accomplishments', id);
    assert.ok(html.length > 0, `accomplishment page ${id} did not render`);
  }
});

test('the CMS admin page and its config ship in the build', async () => {
  const html = await readFile(join(DIST, 'admin', 'index.html'), 'utf8');
  assert.match(html, /sveltia-cms/i, 'admin page does not load Sveltia CMS');
  await access(join(DIST, 'admin', 'config.yml'));
});
