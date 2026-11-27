<script lang="ts">
    import type Fuse from 'fuse.js'
    import { Circle, FilePlus, FileQuestion, Forward, Folder, Globe, Hash } from "lucide-svelte";
    import type { SearchFile } from "src/suggester/fuzzySearch";
    import type { SearchRowKey } from "src/utils/searchRowOrder";
    import { TITLE_FIELD, type FrontmatterFieldValue } from "src/utils/frontmatterFields";
	import type { TextInputSuggester } from "src/suggester/suggester";
	import Suggestion from './suggestion.svelte';

    export let index: number
    export let textInputSuggester: TextInputSuggester<SearchFile>
    export let selectedItemIndex: number
    export let suggestion: Fuse.FuseResult<SearchFile>

    export let nameToDisplay: string
    export let filePath: string | undefined = undefined
    export let matchedHeading: string | undefined = undefined
    export let matchedAlias: string | undefined = undefined
    export let matchedTitle: string | undefined = undefined
    export let frontmatter: FrontmatterFieldValue[] | undefined = undefined
    export let rowOrder: SearchRowKey[] | undefined = undefined

    // 使用智能响应式，只在 suggestion 对象引用变化时更新，避免闪烁
    let suggestionItem = suggestion.item
    $: if (suggestion) suggestionItem = suggestion.item

    // 副行渲染顺序：按设置页配置的 rowOrder 循环；未配置时退回默认顺序
    type SecondaryRow = { key: SearchRowKey, icon: typeof Circle, ariaLabel: string, text: string }
    $: rows = (() => {
        const result: SecondaryRow[] = []
        const order: SearchRowKey[] = rowOrder ?? ['alias', 'frontmatter', 'heading']
        const fallbackAlias = !matchedAlias && !matchedTitle && !matchedHeading
            && !!suggestionItem.aliases?.includes(nameToDisplay)
        for (const key of order) {
            if (key === 'alias' && (matchedAlias || fallbackAlias)) {
                result.push({ key, icon: Forward, ariaLabel: 'Matched alias', text: `Alias of ${suggestionItem.basename}` })
            } else if (key === 'frontmatter' && frontmatter) {
                for (const entry of frontmatter) {
                    // The document title is a special frontmatter field: it keeps its own icon.
                    const isTitle = entry.key === TITLE_FIELD
                    result.push({
                        key,
                        icon: isTitle ? Hash : Circle,
                        ariaLabel: isTitle ? 'Document title' : 'Frontmatter field',
                        text: `${entry.key}: ${entry.value}`,
                    })
                }
            } else if (key === 'heading' && matchedHeading) {
                result.push({ key, icon: Hash, ariaLabel: 'Heading', text: matchedHeading })
            }
        }
        return result
    })()
</script>

<Suggestion {index} {textInputSuggester} {selectedItemIndex}
    suggestionTitleClass={`suggestion-title home-tab-suggestion-title ${suggestionItem.isUnresolved ? 'is-unresolved' : ''}`}>
    <!-- File name (or alias) -->
    <svelte:fragment slot="suggestion-title">
        <span>{nameToDisplay}</span>
        {#if suggestionItem.fileType != 'markdown' && !suggestionItem.isWebUrl}
            <div class="nav-file-tag home-tab-suggestion-file-tag">
                {suggestionItem.extension}
            </div>
        {/if}
    </svelte:fragment>
    <!-- File details -->
    <svelte:fragment slot="suggestion-extra-content">
        {#if suggestionItem.isCreated}
            {#each rows as row (row.key + row.text)}
                <div class="home-tab-suggestion-description home-tab-suggestion-doc-title">
                    <span class="home-tab-suggestion-doc-title-icon">
                        <row.icon size={15} aria-label={row.ariaLabel}/>
                    </span>
                    <span>{row.text}</span>
                </div>
            {/each}
        {/if}
    </svelte:fragment>
    <svelte:fragment slot="suggestion-aux">
        <!-- Display if a file is not created -->
        {#if !suggestionItem.isCreated}
            <div class="home-tab-suggestion-tip">
                {#if suggestionItem.isUnresolved}
                    <FilePlus size={15} aria-label={'Not created yet, select to create'}/>
                {:else}
                    <FileQuestion size={15} aria-label={'Non exists yet, select to create'}/>
                    <div class="suggestion-hotkey">
                        <span>Enter to create</span>
                    </div>
                {/if}
            </div>
        {:else if suggestionItem.isWebUrl}
            <div class="home-tab-suggestion-filepath">
                <Globe size={15} aria-label={'WebViewer'}/>
                <span>WebViewer</span>
            </div>
        {:else if (suggestionItem.isCreated || suggestionItem.isUnresolved) && filePath}
            <div class="home-tab-suggestion-filepath" aria-label="File path">
                <Folder size={15}/>
                <span class="home-tab-file-path">{filePath}</span>
            </div>
        {/if}
    </svelte:fragment>
</Suggestion>
