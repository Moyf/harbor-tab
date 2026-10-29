import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import vm from 'node:vm';

let settings = { searchDropdownDisplay: 'overlay', searchBarStyle: 'modern' };
const listeners = new Set();
const pluginSettingsStore = {
    subscribe(callback) {
        listeners.add(callback);
        callback(settings);
        return () => listeners.delete(callback);
    },
};
function updateSettings(value) {
    settings = value;
    for (const callback of listeners) callback(settings);
}

class Element {
    constructor(ownerDocument, className = '') {
        this.ownerDocument = ownerDocument;
        this.className = className;
        this.children = [];
        this.dataset = {};
        this.style = { width: '' };
        this.parentNode = undefined;
    }
    // Mirrors the Obsidian helper: assign each style key directly.
    setCssStyles(styles) { Object.assign(this.style, styles); }
    appendChild(child) {
        child.parentNode?.removeChild(child);
        this.children.push(child);
        child.parentNode = this;
        return child;
    }
    removeChild(child) {
        this.children = this.children.filter(item => item !== child);
        child.parentNode = undefined;
        return child;
    }
    remove() {
        this.parentNode?.removeChild(this);
    }
    createDiv(className) {
        return new Element(this.ownerDocument, className);
    }
};

const ownerWindow = {
    ResizeObserver: class {
        observe() {}
        disconnect() {}
    },
};
const ownerDocument = { defaultView: ownerWindow };
ownerDocument.body = new Element(ownerDocument, 'body');
const parent = new Element(ownerDocument, 'searchbar-container');
const anchor = new Element(ownerDocument, 'searchbar');
const node = new Element(ownerDocument, 'home-tab-suggestion-container');
node.style.width = '73%';
parent.appendChild(node);

let popperOptions;
const popper = {
    destroy() {},
    update() {},
    setOptions() {},
};
const dependencies = {
    '@popperjs/core': {
        createPopper(_anchor, _layer, options) {
            popperOptions = options;
            return popper;
        },
    },
    '../store': { pluginSettingsStore },
};
const source = readFileSync(new URL('../src/utils/searchDropdown.ts', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' });
const sandbox = {
    module: { exports: {} },
    window: ownerWindow,
    require(name) {
        if (name in dependencies) return dependencies[name];
        throw new Error(`Unexpected import: ${name}`);
    },
};
vm.runInNewContext(code, sandbox);
const { mountSearchDropdown } = sandbox.module.exports;

const cleanup = mountSearchDropdown(node, anchor, parent);
assert.equal(node.style.width, '100%', 'Overlay dropdown fills the Popper layer, matching the search bar width');
assert.equal(parent.children.includes(node), false, 'Overlay moves the dropdown out of the inline parent');
const widthModifier = popperOptions.modifiers.find(modifier => modifier.name === 'matchInputWidth');
const state = { styles: { popper: {} }, rects: { reference: { width: 432 } } };
widthModifier.fn({ state });
assert.equal(state.styles.popper.width, '432px', 'Popper layer matches the input width');

updateSettings({ searchDropdownDisplay: 'expand', searchBarStyle: 'modern' });
assert.equal(node.style.width, '73%', 'Returning to inline mode restores the original inline width');
assert.equal(parent.children.includes(node), true, 'Inline mode restores the dropdown to its original parent');
cleanup();
console.log('Search dropdown width passed: overlay matches input; inline mode restores prior width.');
