import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

// The vm sandbox builds arrays in another realm, so compare plain copies.
const plain = value => JSON.parse(JSON.stringify(value));
const load = (path, imports = {}) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
    const sandbox = { module: { exports: {} }, require: name => imports[name] ?? {} };
    vm.runInNewContext(code, sandbox);
    return sandbox.module.exports;
};

const fileDisplayName = load('../src/utils/fileDisplayName.ts');
const {
    TITLE_FIELD,
    normalizeFrontmatterFields,
    orderFrontmatterFields,
    migrateLegacyFrontmatterFields,
    collectVaultFrontmatterFields,
    getFrontmatterFieldValues,
} = load('../src/utils/frontmatterFields.ts', { './fileDisplayName': fileDisplayName });

// The document title is a special field.
assert.equal(TITLE_FIELD, 'title');

// Normalizing accepts an array or a comma-separated string and keeps the order.
assert.deepEqual(plain(normalizeFrontmatterFields(['title', 'status'])), ['title', 'status']);
assert.deepEqual(plain(normalizeFrontmatterFields('title, status ,')), ['title', 'status']);
assert.deepEqual(plain(normalizeFrontmatterFields(['title', '', '  ', 'title'])), ['title']);
assert.deepEqual(plain(normalizeFrontmatterFields(undefined)), []);
assert.deepEqual(plain(normalizeFrontmatterFields(null)), []);
assert.deepEqual(plain(normalizeFrontmatterFields(42)), []);
assert.deepEqual(plain(normalizeFrontmatterFields(['title', 7, 'status'])), ['title', 'status']);

// The document title always comes first; the other fields keep the user order.
assert.deepEqual(plain(orderFrontmatterFields(['status', 'title'])), ['title', 'status']);
assert.deepEqual(plain(orderFrontmatterFields(['status', 'draft', 'title'])), ['title', 'status', 'draft']);
assert.deepEqual(plain(orderFrontmatterFields(['status', 'draft'])), ['status', 'draft']);
assert.deepEqual(plain(orderFrontmatterFields([])), []);

// Legacy settings migrate to the new field list.
assert.deepEqual(plain(migrateLegacyFrontmatterFields({})), ['title']);
assert.deepEqual(plain(migrateLegacyFrontmatterFields({ displayNameProperties: 'title' })), ['title']);
assert.deepEqual(plain(migrateLegacyFrontmatterFields({ displayNameProperties: 'title, alias' })), ['title', 'alias']);
assert.deepEqual(plain(migrateLegacyFrontmatterFields({ displayNameProperties: 'alias, title' })), ['title', 'alias']);
// The old toggles turned the rows off, so the title drops out of the list.
assert.deepEqual(plain(migrateLegacyFrontmatterFields({ showTitleInSearchResults: false })), []);
assert.deepEqual(plain(migrateLegacyFrontmatterFields({ frontmatterRowEnabled: false })), []);
assert.deepEqual(plain(migrateLegacyFrontmatterFields({ displayNameProperties: 'title, alias', frontmatterRowEnabled: false })), ['alias']);

// The vault scan ranks the frontmatter keys by how often they are used.
const app = {
    vault: {
        getMarkdownFiles() {
            return [{ path: 'a.md' }, { path: 'b.md' }, { path: 'c.md' }];
        },
    },
    metadataCache: {
        getFileCache(file) {
            if (file.path === 'a.md') return { frontmatter: { title: 'A', status: '草稿' } };
            if (file.path === 'b.md') return { frontmatter: { status: 'done', tags: ['x'] } };
            return { frontmatter: { status: 'draft' } };
        },
    },
};
assert.deepEqual(plain(collectVaultFrontmatterFields(app)), ['title', 'status', 'tags']);

// Every selected field contributes its first usable value; missing fields add no row.
const file = { path: 'a.md' };
app.metadataCache.getFileCache = target => target.path === 'a.md'
    ? { frontmatter: { title: 'A', status: '草稿', tags: ['x', 'y'], count: 3, done: true, empty: '  ' } }
    : undefined;
assert.deepEqual(plain(getFrontmatterFieldValues(app, file, ['title', 'status', 'tags', 'count', 'done', 'empty', 'missing'])), [
    { key: 'title', value: 'A' },
    { key: 'status', value: '草稿' },
    { key: 'tags', value: 'x' },
    { key: 'count', value: '3' },
    { key: 'done', value: 'true' },
]);
assert.deepEqual(plain(getFrontmatterFieldValues(app, file, [])), []);

console.log('Frontmatter fields passed: normalization, title ordering, legacy migration, vault scan, and value resolution.');
