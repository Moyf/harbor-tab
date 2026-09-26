<script lang="ts">
	import { App, Menu, Notice, TFile, View, getIcon } from "obsidian";
	import type { HomeTabSettings } from "src/settings";
	import { IconSelectionModal } from "src/iconSelectionModal";
	import FileDisplayItem from "./svelteComponents/fileDisplayItem.svelte";
	import type { bookmarkedFile, bookmarkedFilesManager } from "src/bookmarkedFiles";

    export let view: View
    export let bookmarkedFiles: bookmarkedFile[]
    export let pluginSettings: HomeTabSettings
    export let bookmarkedFileManager: bookmarkedFilesManager

    const app: App = view.leaf.app

    let selectedFile: TFile

    // Section collapse state (only when pluginSettings.sectionCollapsible is on)
    let sectionCollapsed = false

    function toggleSectionCollapsed(): void {
        sectionCollapsed = !sectionCollapsed
    }

    const selectIconModal: IconSelectionModal = new IconSelectionModal(app, undefined, (icon) => bookmarkedFileManager.updateFileIcon(selectedFile, icon))

    const contextualMenu: Menu = new Menu()
            .addItem((item) => item
                .setTitle('Remove bookmark')
                .setIcon('trash-2')
                .onClick(() => bookmarkedFileManager.removeBookmark(selectedFile)))
            .addSeparator()
            .addItem((item) => item
                .setTitle('Set custom icon')
                .setIcon('plus')
                .onClick(() => selectIconModal.open()))
            .setUseNativeMenu(app.vault.config.nativeMenus)  
</script>

<div class="home-tab-bookmarked-files-container">
    {#if pluginSettings.sectionCollapsible}
        <div class="home-tab-bookmarked-files-title">
            <button
                class="home-tab-section-collapse-btn clickable-icon"
                on:click={toggleSectionCollapsed}
                aria-label={sectionCollapsed ? 'Expand bookmarks' : 'Collapse bookmarks'}
                aria-expanded={!sectionCollapsed}
            >
                {@html getIcon(sectionCollapsed ? 'chevron-right' : 'chevron-down')?.outerHTML ?? ''}
            </button>
            <span class="home-tab-bookmarked-files-title-text">Bookmarks</span>
        </div>
    {/if}
    {#if !sectionCollapsed}
        <div class="home-tab-bookmarked-files-list">
            {#each bookmarkedFiles as item (item.file.path)}
                <FileDisplayItem file={item.file} customIcon={item.iconId} {app} {pluginSettings} {contextualMenu}
                on:itemMenu={(e) => selectedFile = e.detail.file}/>
            {/each}
        </div>
    {/if}
</div>

<style>
    .home-tab-bookmarked-files-container{
        display: flex;
        flex-direction: column;

        width: 65%;
        /* min-width: 150px; */
        max-width: 900px;

        padding-top: 30px;
        margin: auto;
    }
    .home-tab-bookmarked-files-list{
        display: flex;
        align-items: baseline;
        justify-content: center;
        flex-wrap: wrap;

        width: 100%;
    }
    .home-tab-bookmarked-files-title{
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-weight: 600;
        font-size: var(--font-ui-large);
        padding-bottom: 5px;
    }
    .home-tab-bookmarked-files-title-text{
        white-space: nowrap;
    }
    .home-tab-section-collapse-btn{
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: var(--radius-s);
    }
    .home-tab-section-collapse-btn:hover{
        color: var(--text-normal);
        background-color: var(--background-modifier-hover);
    }
    .home-tab-section-collapse-btn :global(svg){
        width: 16px;
        height: 16px;
    }

    @media(max-width: 600px){
        .home-tab-bookmarked-files-container{
            width: 90%;
        }
    }
</style>