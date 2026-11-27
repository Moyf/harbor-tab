import type { App, TFile } from 'obsidian'

/** Resolve the first usable value of a single frontmatter property. */
export function resolveFrontmatterValue(frontmatter: Record<string, unknown> | undefined, property: string): string | undefined {
    if (!frontmatter || !Object.prototype.hasOwnProperty.call(frontmatter, property)) return undefined
    const rawValue = frontmatter[property]
    const value: unknown = Array.isArray(rawValue) ? rawValue[0] : rawValue
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'boolean') return String(value)
    return undefined
}

/** Resolve configured frontmatter properties in order, then use the real file name. */
export function resolveFileDisplayName(frontmatter: Record<string, unknown> | undefined, properties: string, basename: string): string {
    for (const property of properties.split(',').map(value => value.trim()).filter(Boolean)) {
        const value = resolveFrontmatterValue(frontmatter, property)
        if (value !== undefined) return value
    }
    return basename
}

export function getFileDisplayName(app: App, file: TFile, properties: string): string {
    if (!properties.trim()) return file.basename
    return resolveFileDisplayName(app.metadataCache.getFileCache(file)?.frontmatter, properties, file.basename)
}
