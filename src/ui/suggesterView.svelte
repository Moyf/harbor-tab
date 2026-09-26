<script lang="ts">
    import { quintOut } from 'svelte/easing'
    import { slide } from 'svelte/transition'
    import type { Writable } from 'svelte/store'
	import type { Suggester, TextInputSuggester, suggesterViewOptions } from '../suggester/suggester';

    export let options: suggesterViewOptions
    export let textInputSuggester: TextInputSuggester<any>
    // 根元素通过 store 暴露给建议器，销毁时可同步移除 DOM（防止连续切换时下拉叠加）
    export let viewRoot: Writable<HTMLElement | undefined>

    let suggester: Suggester<any> = textInputSuggester.getSuggester()

    let suggestions: any[] = []
    let previousLength = 0

    // 只在建议数量变化时更新
    suggester.suggestionsStore.subscribe((value) => {
        const newSuggestions = value || [];
        if (newSuggestions.length !== previousLength) {
            previousLength = newSuggestions.length;
            suggestions = newSuggestions;
        }
    })
    
    let selectedItemIndex: number
    suggester.selectedItemIndexStore.subscribe((value) => selectedItemIndex = value)
    
    const suggestionWrapper = suggester.suggestionsContainer
</script>

{#if suggestions?.length > 0}
    <div class="{options.containerClass ?? 'suggestion-container popover suggestion-popover'}" 
        bind:this={$viewRoot}
        on:mousedown="{(e) => e.preventDefault()}"
        transition:slide={{duration:200, easing: quintOut}}>
        <div class="{options.suggestionClass ?? 'suggestion'} {options.additionalClasses ?? ''}" class:scrollable="{options.isScrollable}"
            style="{options.style ?? ''}" bind:this={$suggestionWrapper}>
            {#each suggestions as suggestion, index (index)}
                <svelte:component this={textInputSuggester.getDisplayElementComponentType()}
                                {index} {suggestion} {textInputSuggester} {selectedItemIndex}
                                {... textInputSuggester.getDisplayElementProps(suggestion)}/>
            {/each}
        </div>
        {#if options.additionalModalInfo}
            <div class="suggester-additional-info">
                {@html options.additionalModalInfo.outerHTML}
            </div>
        {/if}
    </div>
{/if}

<style>
    .scrollable{
        overflow-y: auto;
    }
</style>