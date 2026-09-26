/**
 * Grid-aware keyboard navigation for flex-wrap file lists (shared by the
 * recent files and bookmarks sections). Rows wrap depending on the container
 * width, so vertical movement keeps the current column by jumping to the item
 * whose horizontal center is the closest one in the target row (no wrap-around
 * at the first/last row).
 */
export function moveListSelectionVertically(container: HTMLElement | undefined, index: number, delta: 1 | -1): number {
    const items = Array.from(container?.querySelectorAll<HTMLElement>('.home-tab-file-item') ?? [])
    const rects = items.map(el => el.getBoundingClientRect())
    const current = rects[index]
    if (!current) return index

    // Group the items into visual rows by their vertical center
    const rowCenters: number[] = []
    const rows: number[][] = []
    rects.forEach((rect, i) => {
        const cy = rect.top + rect.height / 2
        const rowIndex = rowCenters.findIndex(center => Math.abs(center - cy) < rect.height / 2)
        if (rowIndex === -1) {
            rowCenters.push(cy)
            rows.push([i])
        } else {
            rows[rowIndex].push(i)
        }
    })

    const currentCy = current.top + current.height / 2
    const currentRowIndex = rowCenters.findIndex(center => Math.abs(center - currentCy) < current.height / 2)
    const targetRowIndex = currentRowIndex + delta
    if (currentRowIndex === -1 || targetRowIndex < 0 || targetRowIndex >= rows.length) return index

    // In the target row, pick the item closest to the current column
    const currentCx = current.left + current.width / 2
    let best = rows[targetRowIndex][0]
    let bestDistance = Infinity
    for (const i of rows[targetRowIndex]) {
        const cx = rects[i].left + rects[i].width / 2
        const distance = Math.abs(cx - currentCx)
        if (distance < bestDistance) {
            bestDistance = distance
            best = i
        }
    }
    return best
}

/** Horizontal movement wraps around the ends of the list */
export function moveListSelectionHorizontally(index: number, length: number, delta: 1 | -1): number {
    if (length === 0) return index
    return (index + delta + length) % length
}

export function scrollListItemIntoView(container: HTMLElement | undefined, index: number): void {
    const items = container?.querySelectorAll('.home-tab-file-item')
    items?.[index]?.scrollIntoView({ block: 'nearest' })
}
