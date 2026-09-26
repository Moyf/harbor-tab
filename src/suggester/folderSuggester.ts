import { AbstractInputSuggest, prepareFuzzySearch, TFolder, type App } from 'obsidian'

/** Fallback when no limit is provided */
const DEFAULT_MAX_SUGGESTIONS = 6

/**
 * Vault folder suggester built on the official AbstractInputSuggest, which
 * handles popover positioning (including popout windows) out of the box.
 * Used by the new-note modal and the default-folder setting.
 */
export default class FolderSuggester extends AbstractInputSuggest<TFolder>{
    private inputEl: HTMLInputElement
    private maxSuggestions: number

    constructor(app: App, inputEl: HTMLInputElement, maxSuggestions: number = DEFAULT_MAX_SUGGESTIONS){
        super(app, inputEl)
        this.inputEl = inputEl
        this.maxSuggestions = Math.max(1, maxSuggestions)
    }

    getSuggestions(query: string): TFolder[] {
        // The root folder renders as an empty input value, keep it out of the list
        const folders = this.app.vault.getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder && file.path !== '/')
        const trimmedQuery = query.trim()
        if(trimmedQuery === ''){
            return folders.slice(0, this.maxSuggestions)
        }
        const search = prepareFuzzySearch(trimmedQuery)
        return folders
            .map(folder => ({folder, result: search(folder.path)}))
            .filter(item => item.result !== null)
            .sort((a, b) => (b.result!.score ?? 0) - (a.result!.score ?? 0))
            .slice(0, this.maxSuggestions)
            .map(item => item.folder)
    }

    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.addClass('suggestion-item')
        el.setText(folder.path)
    }

    selectSuggestion(folder: TFolder): void {
        this.inputEl.value = folder.path
        this.inputEl.trigger('input')
        this.close()
    }
}
