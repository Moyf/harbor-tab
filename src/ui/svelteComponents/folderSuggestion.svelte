<script lang="ts">
    import { Folder } from 'lucide-svelte';
    import Suggestion from './suggestion.svelte';
    import type { TextInputSuggester } from 'src/suggester/suggester';

    export let folderPath: string;
    export let index: number;
    export let selectedItemIndex: number;
    export let textInputSuggester: TextInputSuggester<any>;
</script>

<Suggestion {index} {textInputSuggester} {selectedItemIndex}>
    <svelte:fragment slot="suggestion-title">
        <span>{folderPath}</span>
    </svelte:fragment>
    <svelte:fragment slot="suggestion-aux">
        <div class="home-tab-suggestion-filepath">
            <Folder size={15}/>
            <span>Folder</span>
        </div>
    </svelte:fragment>
</Suggestion>
