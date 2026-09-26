<script lang="ts">
    import { Platform, getIcon } from "obsidian";
    import { filterKeys, type FilterKey, type SearchBarFilterType } from "src/homeTabSearchbar";
    import type HomeTabSearchBar from "src/homeTabSearchbar";
    import { pluginSettingsStore } from "src/store";
    import { t } from "src/i18n";
    import { advanceSectionFocus } from "src/store";
    import { onMount } from 'svelte';

    export let HomeTabSearchBar: HomeTabSearchBar
    export let embedded: boolean = false
    const searchBarEl = HomeTabSearchBar.searchBarEl
    const activeExtEl = HomeTabSearchBar.activeExtEl
    const container = HomeTabSearchBar.suggestionContainerEl
    const unmatchedNameActive = HomeTabSearchBar.unmatchedNameActive
    // @ts-ignore
    const isPhone = Platform.isPhone

    let inputValue = ''
    let inputEl: HTMLInputElement;

    onMount(() => {
        if (inputEl) {
            HomeTabSearchBar.setSearchBarEl(inputEl);
        }
    });

    function handleKeydown(e: KeyboardEvent): void{
        // The typed name matches no note: open the create dialog pre-filled
        if(e.key === 'Enter' && !e.isComposing && HomeTabSearchBar.openNewNoteFromInput(inputValue)){
            e.preventDefault()
            return
        }

        // If the input field is empty and a filter is active remove it
        if(e.key === 'Backspace'){
            if(inputValue != '') return
            if(HomeTabSearchBar.activeFilter){
                HomeTabSearchBar.updateActiveSuggester('default')
                // this.fileSuggester = new HomeTabFileSuggester(this.plugin.app, this.plugin, this.view, this)
                // this.fuzzySearch.updateSearchArray(this.files)
                // this.activeFilterEl.toggleClass('hide', true)
            }
        }

        if(e.key === 'Tab'){
            e.preventDefault()
            const key = inputValue.toLowerCase()
            if(!e.shiftKey && filterKeys.find(item => item === key)){
                // Activate search filter with tab
                HomeTabSearchBar.updateActiveSuggester(key as FilterKey)
                // 过滤词已完成使命（显示在过滤标签上），清空搜索框等待真正的搜索内容
                inputValue = ''
            }
            // Shift+Tab (reverse loop): walk the sections chain backwards (recent list first)
            else if(e.shiftKey){
                advanceSectionFocus('search', true, () => HomeTabSearchBar.focusSearchbar())
            }
            // Tab (forward loop): walk the sections chain forwards (bookmarks filter first)
            else{
                advanceSectionFocus('search', false, () => HomeTabSearchBar.focusSearchbar())
            }
        }
    }

</script>

<div class="home-tab-searchbar-container" bind:this={$container}>
    <div class="home-tab-searchbar"
        class:embedded={embedded}
        style:width={embedded || isPhone ? "90%" : "50%"}>
        <div class='nav-file-tag home-tab-suggestion-file-tag hide' bind:this={$activeExtEl}></div>
        <input type="search" spellcheck="false" placeholder="Type to start search..." bind:value={inputValue} bind:this={inputEl}
        on:keydown={(e) => handleKeydown(e)}>
        {#if $pluginSettingsStore?.showNewNoteButton}
            <button type="button" class="home-tab-new-note-button" class:active={$unmatchedNameActive}
                aria-label={t().newNoteModal.title}
                on:click={() => HomeTabSearchBar.openNewNote()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{@html getIcon('plus')?.innerHTML}</svg>
            </button>
        {/if}
    </div>
</div>

<style>
    .home-tab-searchbar-container{
        display: flex;
        align-items: center;
        flex-direction: column;
    }
    
    .home-tab-searchbar{
        display: flex;
        /* width: 50%; */
        min-width: 250px;
        max-width: 700px;
        margin: 0 auto;

        height: calc(var(--input-height)*1.25);

        background-color: var(--background-modifier-form-field);
        border: var(--input-border-width) solid var(--background-modifier-border);
        padding: var(--size-2-3);
        border-radius: var(--input-radius);
        outline: none;
    }

    .home-tab-searchbar input{
        width: 100%;
        height: 100%;
        box-shadow: none;
        font-size: var(--font-ui-medium);
        background: none;
        border: none;
        padding-left: 12px;
    }
    .home-tab-searchbar input:hover{
        background: none;
        border: none;
    }

    .home-tab-suggestion-file-tag.hide{
        display: none;
    }

    .home-tab-new-note-button{
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        aspect-ratio: 1;
        padding: 0;
        margin-left: 4px;
        background: none;
        border: none;
        border-radius: var(--input-radius);
        box-shadow: none;
        color: var(--text-muted);
        cursor: pointer;
    }
    .home-tab-new-note-button:hover{
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
    }
    .home-tab-new-note-button.active,
    .home-tab-new-note-button.active:hover{
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
    }
    .home-tab-new-note-button svg{
        display: block;
    }
</style>