import { writable } from 'svelte/store'
import type { HomeTabSettings } from './settings'
import type { recentFile } from './recentFiles'
import type { bookmarkedFile } from './bookmarkedFiles'

export const pluginSettingsStore = writable<HomeTabSettings>()
export const bookmarkedFiles = writable<bookmarkedFile[]>()
export const recentFiles = writable<recentFile[]>([])

// Tab focus chain: search bar -> bookmarks filter -> bookmarks list -> recent filter -> recent list -> back to the search bar.
// Shift+Tab walks the same chain in reverse. Sections that cannot take focus
// (hidden, collapsed, empty...) forward the request to the next element.
export type SectionFocusTarget = 'bookmarks-filter' | 'bookmarks-list' | 'recent-filter' | 'recent-list'
const FOCUS_CHAIN_FORWARD: SectionFocusTarget[] = ['bookmarks-filter', 'bookmarks-list', 'recent-filter', 'recent-list']
const FOCUS_CHAIN_BACKWARD: SectionFocusTarget[] = [...FOCUS_CHAIN_FORWARD].reverse()

export interface SectionFocusRequest {
    target: SectionFocusTarget
    backward: boolean
    seq: number
}

interface FocusChainAvailability { bookmarks: boolean; recent: boolean }
let chainAvailability: FocusChainAvailability = { bookmarks: true, recent: true }

/** Which sections currently exist in the view; unavailable targets are skipped by the chain */
export function setFocusChainAvailability(availability: FocusChainAvailability): void {
    chainAvailability = availability
}

function isTargetAvailable(target: SectionFocusTarget): boolean {
    return target.startsWith('bookmarks') ? chainAvailability.bookmarks : chainAvailability.recent
}

let sectionFocusSeq = 0
export const sectionFocusRequest = writable<SectionFocusRequest>({ target: FOCUS_CHAIN_FORWARD[0], backward: false, seq: 0 })

/** Next focusable element in the Tab chain when leaving `from` in the given direction ('search' = the search bar, undefined = nowhere to go) */
export function nextFocusTarget(from: SectionFocusTarget | 'search', backward: boolean): SectionFocusTarget | 'search' | undefined {
    const chain = backward ? FOCUS_CHAIN_BACKWARD : FOCUS_CHAIN_FORWARD
    if (from === 'search') {
        for (const target of chain) {
            if (isTargetAvailable(target)) return target
        }
        return undefined
    }
    for (let i = chain.indexOf(from) + 1; i < chain.length; i++) {
        if (isTargetAvailable(chain[i])) return chain[i]
    }
    return 'search'
}

/**
 * Advance the focus chain from `from` and dispatch the request to the sections.
 * When the chain ends the search bar grabs focus through the given callback.
 */
export function advanceSectionFocus(from: SectionFocusTarget | 'search', backward: boolean, focusSearchBar: () => void): void {
    const next = nextFocusTarget(from, backward)
    if (next === 'search') {
        focusSearchBar()
        return
    }
    if (next) {
        sectionFocusRequest.update(() => ({ target: next, backward, seq: ++sectionFocusSeq }))
    }
}
