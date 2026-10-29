/**
 * A light that follows the pointer across a card.
 *
 * Technique (ported from beautiful-chat's pointer glow): a `radial-gradient`
 * is painted in each marked card's own `background-image`, positioned by the
 * CSS custom properties `--htgx/--htgy`. `background-image` cannot transition,
 * so the fade rides on the registered custom property `--htga`: the
 * `@property` rule makes it a real `<number>` that CSS can animate, and the
 * gradient reads it through `calc()`.
 *
 * The light lives in the card's background layer, not in an overlay: children
 * with their own surface (icons, text blocks) naturally occlude it, so the
 * glow shows on the card's chrome and never washes over content.
 *
 * All glow CSS lives in the plugin's static `styles.css` (Obsidian loads it
 * into every window); this module only drives behavior at runtime.
 *
 * One listener per document drives every card — the listeners and the active
 * card are shared through a WeakMap keyed by document, because a Harbor Tab
 * view and embedded `search-bar` blocks can coexist in one document.
 * Position is written straight to the hovered node as custom properties, so
 * nothing re-renders and the paint is a single small gradient per frame.
 *
 * The look is parameterized through CSS variables the host sets on the
 * marked element: `--htgc-light/-dark` (glow color per theme, falling back to
 * the theme accent), `--htgs` (peak alpha from the strength slider) and
 * `--htgr` (edge-damped radius, written here).
 */

const ATTRIBUTE = 'data-htglow'
const ACTIVE_ATTRIBUTE = 'data-htglow-on'
/** Full radius of the light, also the distance over which edges damp it. */
const GLOW_RADIUS = 120

export interface PointerGlowHandle {
    /** Stop following the pointer and release the shared per-document state. */
    destroy(): void
    /** Reflect the runtime toggle: true = glow active, false = force-off. */
    setEnabled(enabled: boolean): void
}

/** Glow engine shared by every handle installed on the same document. */
interface PointerGlowState {
    refs: number
    enabled: boolean
    active: HTMLElement | null
    pending: { target: HTMLElement; x: number; y: number } | null
    frame: number
    /** Turn the light off and cancel anything queued to turn it on. */
    clear(): void
    /** Remove the pointer/leave/blur listeners. */
    dispose(): void
}

const states = new WeakMap<Document, PointerGlowState>()

function createPointerGlowState(doc: Document, view: Window): PointerGlowState {
    const state: PointerGlowState = {
        refs: 0,
        enabled: true,
        active: null,
        pending: null,
        frame: 0,
        clear,
        dispose,
    }

    function paint(): void {
        state.frame = 0
        const next = state.pending
        state.pending = null
        if (!next || !state.enabled) return
        if (state.active && state.active !== next.target) state.active.removeAttribute(ACTIVE_ATTRIBUTE)
        state.active = next.target
        // Read the rect once per frame, not per pointermove event: high-
        // polling mice would otherwise force a layout read per event. A fresh
        // rect also keeps the light under the pointer if the card moved or
        // scrolled between the event and this frame.
        const box = next.target.getBoundingClientRect()
        const x = next.x - box.left
        const y = next.y - box.top
        // Near an edge the circle would clip against the element bounds:
        // shrink it over one radius (smoothstepped) so the light eases out
        // instead of cutting off. Edge distances past the radius keep the
        // full size.
        const edge = Math.min(x, y, box.width - x, box.height - y)
        const t = Math.max(0, Math.min(1, edge / GLOW_RADIUS))
        const factor = t * t * (3 - 2 * t)
        state.active.style.setProperty('--htgr', `${Math.round(GLOW_RADIUS * factor)}px`)
        state.active.style.setProperty('--htgx', `${x}px`)
        state.active.style.setProperty('--htgy', `${y}px`)
        state.active.setAttribute(ACTIVE_ATTRIBUTE, '')
    }

    function clear(): void {
        state.pending = null
        if (state.frame !== 0) {
            view.cancelAnimationFrame(state.frame)
            state.frame = 0
        }
        if (!state.active) return
        state.active.removeAttribute(ACTIVE_ATTRIBUTE)
        state.active = null
    }

    function onMove(event: PointerEvent): void {
        if (!state.enabled) {
            clear()
            return
        }
        const target = event.target instanceof Element ? event.target.closest(`[${ATTRIBUTE}]`) : null
        if (!(target instanceof HTMLElement)) {
            clear()
            return
        }
        // Resolve the theme at pointer time: Obsidian toggles theme-dark /
        // theme-light on body, so a mid-session switch needs no re-marking.
        const theme = doc.body.classList.contains('theme-light') ? 'light' : 'dark'
        if (target.getAttribute(ATTRIBUTE) !== theme) target.setAttribute(ATTRIBUTE, theme)
        // Client coordinates only; paint() converts them against the rect.
        state.pending = { target, x: event.clientX, y: event.clientY }
        if (state.frame === 0) state.frame = view.requestAnimationFrame(paint)
    }

    // A pointer leaving the window stops reporting moves, so the last card
    // would keep its light on until the pointer returned.
    doc.addEventListener('pointermove', onMove, { passive: true })
    doc.addEventListener('pointerleave', clear)
    view.addEventListener('blur', clear)

    function dispose(): void {
        doc.removeEventListener('pointermove', onMove)
        doc.removeEventListener('pointerleave', clear)
        view.removeEventListener('blur', clear)
    }

    return state
}

/**
 * Install the single pointer listener on `ownerDocument`.
 *
 * The theme attribute is resolved per card at pointer time via the Obsidian
 * body class (`theme-dark` / `theme-light`), so a mid-session theme switch is
 * picked up without re-marking anything.
 */
export function installPointerGlow(ownerDocument: Document): PointerGlowHandle {
    const doc = ownerDocument
    // rAF and blur belong to the document's own window: a view can live in a
    // workspace popout whose frame loop is throttled independently of the
    // main window's.
    const view = doc.defaultView ?? window

    let existing = states.get(doc)
    if (!existing) {
        existing = createPointerGlowState(doc, view)
        states.set(doc, existing)
    }
    const state = existing
    state.refs++

    return {
        destroy(): void {
            state.refs--
            if (state.refs > 0) return
            states.delete(doc)
            // clear() also cancels the pending frame.
            state.clear()
            state.dispose()
        },
        setEnabled(value: boolean): void {
            state.enabled = value
            if (!value) state.clear()
        },
    }
}
