<script lang="ts">
	import { App, Menu, type PaneType, type TFile, View } from "obsidian";
	import { onDestroy } from "svelte";
	import type { HomeTabSettings } from "src/settings";
	import { buildPeriodicNoteEntries, openOrCreatePeriodicNote, type PeriodicNoteEntry } from "src/periodicNotes";
	import FileDisplayItem from "./svelteComponents/fileDisplayItem.svelte";

    export let view: View
    export let pluginSettings: HomeTabSettings

    const app: App = view.leaf.app

    let entries: PeriodicNoteEntry[] = buildPeriodicNoteEntries(app, pluginSettings)

    function refreshEntries(): void {
        entries = buildPeriodicNoteEntries(app, pluginSettings)
    }

    // Follow day/week/month rollovers while the tab stays open
    const rolloverInterval = window.setInterval(refreshEntries, 60_000)
    onDestroy(() => window.clearInterval(rolloverInterval))

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
        {#each entries as entry (entry.path)}
            <!-- svelte-ignore a11y-no-static-element-interactions (right-click opens the item menu) -->
            <div class="home-tab-periodic-note-wrapper"
                on:contextmenu|preventDefault={(event) => showEntryMenu(event, entry)}>
                <FileDisplayItem file={entry.file} displayName={entry.label} customIcon={entry.icon}
                    {app} {pluginSettings} contextualMenu={new Menu()}
                    customOpen={(newTab) => openEntry(entry, newTab)}
                    showMenuButton={false}
                    pending={!entry.exists}/>
            </div>
        {/each}
    </div>
{/if}

<style>
    .home-tab-periodic-notes-container{
        display: flex;
        align-items: baseline;
        justify-content: center;
        flex-wrap: wrap;

        width: 65%;
        max-width: 900px;

        padding-top: 30px;
        margin: auto;
    }
    .home-tab-periodic-note-wrapper{
        display: contents;
    }

    @media(max-width: 600px){
        .home-tab-periodic-notes-container{
            width: 90%;
            display: grid;
            grid-template-columns: 1fr;
            gap: 2px;
            padding-top: 30px;
        }
        .home-tab-periodic-note-wrapper{
            display: block;
        }
    }
</style>
