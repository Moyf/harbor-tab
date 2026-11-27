import type { App, TFile } from 'obsidian'
import { resolveFrontmatterValue } from './fileDisplayName'

/** The document title is a special frontmatter field: it is also searchable. */
export const TITLE_FIELD = 'title'

/** A frontmatter field resolved to the value shown in a search row. */
export interface FrontmatterFieldValue {
    /** The raw frontmatter key, used verbatim as the row prefix. */
    key: string
    value: string
}

/**
 * Normalize the ordered list of frontmatter fields shown as search rows:
 * trimmed, non-empty, and without duplicates. Accepts an array of keys or a
 * comma-separated string. The order is the row order.
 */
export function normalizeFrontmatterFields(value: unknown): string[] {
    const entries = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',')
            : []
    const fields: string[] = []
    for (const entry of entries) {
        if (typeof entry !== 'string') continue
        const key = entry.trim()
        if (!key || fields.includes(key)) continue
        fields.push(key)
    }
    return fields
}

/**
 * Keep the document title first — it is the special field — and let the other
 * fields keep the order the user picked.
 */
export function orderFrontmatterFields(fields: string[]): string[] {
    const normalized = normalizeFrontmatterFields(fields)
    const title = normalized.find(field => field === TITLE_FIELD)
    const rest = normalized.filter(field => field !== TITLE_FIELD)
    return title ? [title, ...rest] : rest
}

/**
 * The fields shown as search rows before the field picker existed: the
 * file-list display-name properties, minus the title when the old toggles
 * were off.
 */
export function migrateLegacyFrontmatterFields(legacy: {
    displayNameProperties?: string
    showTitleInSearchResults?: boolean
    frontmatterRowEnabled?: boolean
}): string[] {
    const fields = normalizeFrontmatterFields(legacy.displayNameProperties ?? TITLE_FIELD)
    const disabled = legacy.showTitleInSearchResults === false || legacy.frontmatterRowEnabled === false
    return orderFrontmatterFields(disabled ? fields.filter(field => field !== TITLE_FIELD) : fields)
}

/**
 * Scan the vault for the frontmatter keys in use, most frequent first. The
 * document title is always offered first because it is a special field.
 */
export function collectVaultFrontmatterFields(app: App): string[] {
    const counts = new Map<string, number>()
    for (const file of app.vault.getMarkdownFiles()) {
        const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter
        if (!frontmatter) continue
        for (const key of Object.keys(frontmatter)) {
            counts.set(key, (counts.get(key) ?? 0) + 1)
        }
    }
    const scanned = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([key]) => key)
    // The document title is a special field, so it is always offered first.
    const rest = scanned.filter(key => key !== TITLE_FIELD)
    return [TITLE_FIELD, ...rest]
}

/**
 * Resolve the selected fields to their first usable value, in list order.
 * A field without a usable value contributes no row.
 */
export function getFrontmatterFieldValues(app: App, file: TFile, fields: string[]): FrontmatterFieldValue[] {
    if (fields.length === 0) return []
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter
    const values: FrontmatterFieldValue[] = []
    for (const key of fields) {
        const value = resolveFrontmatterValue(frontmatter, key)
        if (value !== undefined) values.push({ key, value })
    }
    return values
}
