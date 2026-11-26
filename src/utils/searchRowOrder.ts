export const SEARCH_ROW_KEYS = ['alias', 'title', 'frontmatter', 'heading'] as const

export type SearchRowKey = (typeof SEARCH_ROW_KEYS)[number]

/**
 * Keep saved ordering usable when older settings omit rows or contain stale
 * keys. The canonical order also doubles as the default: matched-source rows
 * first, then frontmatter fields, and the in-document heading last.
 */
export function normalizeSearchRowOrder(value: unknown): SearchRowKey[] {
    const order: SearchRowKey[] = []
    if (Array.isArray(value)) {
        const values: readonly unknown[] = value
        for (const item of values) {
            const key = SEARCH_ROW_KEYS.find(candidate => candidate === item)
            if (key && !order.includes(key)) order.push(key)
        }
    }
    for (const key of SEARCH_ROW_KEYS) {
        if (!order.includes(key)) order.push(key)
    }
    return order
}
