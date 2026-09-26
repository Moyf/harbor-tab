import { AbstractInputSuggest, prepareFuzzySearch, type App, type Command } from 'obsidian'

/** Max suggestions rendered in the popover */
const MAX_SUGGESTIONS = 30

/**
 * Suggests the registered commands of the app (including other plugins'),
 * used by the new-note button command override setting.
 */
export default class CommandSuggester extends AbstractInputSuggest<Command>{
    private inputEl: HTMLInputElement

    constructor(app: App, inputEl: HTMLInputElement){
        super(app, inputEl)
        this.inputEl = inputEl
    }

    getSuggestions(query: string): Command[] {
        const commands = this.app.commands.listCommands()
        const trimmedQuery = query.trim()
        if(trimmedQuery === ''){
            return commands.slice(0, MAX_SUGGESTIONS)
        }
        const search = prepareFuzzySearch(trimmedQuery)
        return commands
            .map(command => ({command, result: search(`${command.name} ${command.id}`)}))
            .filter(item => item.result !== null)
            .sort((a, b) => (b.result!.score ?? 0) - (a.result!.score ?? 0))
            .slice(0, MAX_SUGGESTIONS)
            .map(item => item.command)
    }

    renderSuggestion(command: Command, el: HTMLElement): void {
        el.addClass('suggestion-item')
        el.createDiv({text: command.name})
        el.createDiv({cls: 'suggestion-note', text: command.id})
    }

    selectSuggestion(command: Command): void {
        this.inputEl.value = command.id
        this.inputEl.trigger('input')
        this.close()
    }
}
