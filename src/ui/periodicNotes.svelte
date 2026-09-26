<script lang="ts">
	import { App, Menu, type PaneType, type TFile, View } from "obsidian";
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";
	import type { HomeTabSettings } from "src/settings";
	import type HomeTabSearchBar from "src/homeTabSearchbar";
	import { buildPeriodicNoteEntries, openOrCreatePeriodicNote, type PeriodicNoteEntry } from "src/periodicNotes";
	import { periodicFocusRequest, periodicFocusBackRequest, advanceSectionFocus } from "src/store";
	import FileDisplayItem from "./svelteComponents/fileDisplayItem.svelte";

    export let view: View
    export let pluginSettings: HomeTabSettings
    export let HomeTabSearchBar: HomeTabSearchBar | undefined = undefined

    const app: App = view.leaf.app

    let entries: PeriodicNoteEntry[] = buildPeriodicNoteEntries(app, pluginSettings)
    let selectedIndex = -1
    let listWrapperEl: HTMLElement

    function refreshEntries(): void {
        entries = buildPeriodicNoteEntries(app, pluginSettings)
        if (selectedIndex >= entries.length) {
            selectedIndex = entries.length - 1
        }
    }

    // Follow day/week/month rollovers while the tab stays open
    const rolloverInterval = window.setInterval(refreshEntries, 60_000)
    onDestroy(() => window.clearInterval(rolloverInterval))

    // Expand and focus the first item when requested from the search bar (Tab navigation).
    // Baseline against the current store value so a freshly mounted component (new tab)
    // doesn't replay stale requests; when there is nothing to show, forward to the recent files.
    let lastSeenFocusRequest = get(periodicFocusRequest)
    $: if ($periodicFocusRequest > lastSeenFocusRequest) {
        lastSeenFocusRequest = $periodicFocusRequest
        if (entries.length === 0) {
            advanceSectionFocus('periodic', false, () => HomeTabSearchBar?.focusSearchbar())
        } else {
            focusListItem(0)
        }
    }

    // Focus the last item when coming back from the recent files filter (Shift+Tab)
    let lastSeenFocusBackRequest = get(periodicFocusBackRequest)
    $: if ($periodicFocusBackRequest > lastSeenFocusBackRequest) {
        lastSeenFocusBackRequest = $periodicFocusBackRequest
        if (entries.length === 0) {
            HomeTabSearchBar?.focusSearchbar()
        } else {
            focusListItem(entries.length - 1)
        }
    }

    function focusListItem(index: number): void {
        selectedIndex = index
        setTimeout(() => listWrapperEl?.focus(), 0)
    }

    function scrollSelectedItemIntoView(): void {
        const items = listWrapperEl?.querySelectorAll('.home-tab-file-item')
        items?.[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }

    function moveSelection(delta: 1 | -1): void {
        if (entries.length === 0) return
        selectedIndex = (selectedIndex + delta + entries.length) % entries.length
        scrollSelectedItemIntoView()
    }

    function handleListKeydown(e: KeyboardEvent): void {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            moveSelection(1)
        }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            moveSelection(-1)
        }
        else if (e.key === 'Home') {
            e.preventDefault()
            focusListItem(0)
        }
        else if (e.key === 'End') {
            e.preventDefault()
            focusListItem(entries.length - 1)
        }
        else if (e.key === 'Enter') {
            e.preventDefault()
            const entry = entries[selectedIndex]
            if (entry) {
                openEntry(entry)
                selectedIndex = -1
            }
        }
        else if (e.key === 'Escape') {
            e.preventDefault()
            selectedIndex = -1
            HomeTabSearchBar?.focusSearchbar()
        }
        else if (e.key === 'Tab') {
            e.preventDefault()
            selectedIndex = -1
            if (e.shiftKey) {
                // Shift+Tab (reverse loop): back to the search bar
                HomeTabSearchBar?.focusSearchbar()
            } else {
                // Tab (forward loop): continue along the focus chain (bookmarks / recent sections)
                advanceSectionFocus('periodic', false, () => HomeTabSearchBar?.focusSearchbar())
            }
        }
    }

    function handleListBlur(): void {
        selectedIndex = -1
    }

    /** Opens the note, creating it first when it does not exist yet */
    async function openEntry(entry: PeriodicNoteEntry, newTab?: boolean | PaneType): Promise<TFile | undefined> {
        const file = await openOrCreatePeriodicNote(app, entry)
        if (file) {
            refreshEntries() // update the pending badge after creation
        }
        return file
    }

    function showEntryMenu(event: MouseEvent, entry: PeriodicNoteEntry): void {
        const menu = new Menu()
        if (!entry.exists) {
            menu.addItem((item) => item
                .setTitle('Create note')
                .setIcon('plus')
                .onClick(() => openEntry(entry)))
        }
        menu
            .addItem((item) => item
                .setTitle('Open in new tab')
                .setIcon('tab')
                .onClick(() => openEntry(entry, 'tab')))
            .addItem((item) => item
                .setTitle('Open in new window')
                .setIcon('app-window')
                .onClick(() => openEntry(entry, 'window')))
            .showAtMouseEvent(event)
    }
</script>

{#if entries.length > 0}
    <div class="home-tab-periodic-notes-container">
        <div class="home-tab-periodic-notes-wrapper"
            bind:this={listWrapperEl}
            tabindex="-1"
            on:keydown={handleListKeydown}
            on:blur={handleListBlur}
        >
            {#each entries as entry, index (entry.path)}
                <!-- svelte-ignore a11y-no-static-element-interactions (right-click opens the item menu) -->
                <div class="home-tab-periodic-note-wrapper"
                    on:contextmenu|preventDefault={(event) => showEntryMenu(event, entry)}>
                    <FileDisplayItem file={entry.file} displayName={entry.label} customIcon={entry.icon}
                        {app} {pluginSettings} contextualMenu={new Menu()}
                        customOpen={(newTab) => openEntry(entry, newTab)}
                        showMenuButton={false}
                        pending={!entry.exists}
                        selected={index === selectedIndex}/>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .home-tab-periodic-notes-container{
        width: 65%;
        max-width: 900px;
        padding-top: 30px;
        margin: auto;
    }
    .home-tab-periodic-notes-wrapper{
        display: flex;
        align-items: baseline;
        justify-content: center;
        flex-wrap: wrap;
        outline: none;
    }
    .home-tab-periodic-note-wrapper{
        display: contents;
    }

    @media(max-width: 600px){
        .home-tab-periodic-notes-container{
            width: 90%;
        }
        .home-tab-periodic-notes-wrapper{
            display: grid;
            grid-template-columns: 1fr;
            gap: 2px;
        }
        .home-tab-periodic-note-wrapper{
            display: block;
        }
    }
</style>
