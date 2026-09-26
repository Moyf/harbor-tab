import { Modal, Notice, Setting, TFolder, normalizePath, type App } from 'obsidian'
import type HomeTab from './main'
import FolderSuggester from './suggester/folderSuggester'
import { t } from './i18n'

const FILE_NAME_INVALID_CHARS = /[\\/:*?"<>|#^[\]]/
// Folder paths legitimately contain slashes, only reject the rest
const FOLDER_INVALID_CHARS = /[\\:*?"<>|#^[\]]/

export class NewNoteModal extends Modal {
    private plugin: HomeTab
    private initialFileName: string
    private fileNameInputEl: HTMLInputElement
    private folderInputEl: HTMLInputElement

    constructor(app: App, plugin: HomeTab, initialFileName?: string){
        super(app)
        this.plugin = plugin
        this.initialFileName = initialFileName ?? ''
    }

    onOpen(): void {
        const { contentEl } = this
        const locale = t()

        this.titleEl.setText(locale.newNoteModal.title)

        new Setting(contentEl)
            .setName(locale.newNoteModal.fileName)
            .addText((text) => {
                this.fileNameInputEl = text.inputEl
                text.setPlaceholder(locale.newNoteModal.fileNamePlaceholder)
                if(this.initialFileName){
                    text.setValue(this.initialFileName)
                }
                this.registerInputKeydown(this.fileNameInputEl)
            })

        new Setting(contentEl)
            .setName(locale.newNoteModal.folder)
            .setDesc(locale.newNoteModal.folderDesc)
            .addText((text) => {
                this.folderInputEl = text.inputEl
                new FolderSuggester(this.app, text.inputEl, this.plugin.settings.maxSuggestions)
                text.setPlaceholder(locale.newNoteModal.folderPlaceholder)
                text.setValue(normalizePath(this.plugin.settings.newNoteDefaultFolder ?? ''))
                this.registerInputKeydown(this.folderInputEl)
            })

        new Setting(contentEl)
            .addButton((btn) => btn
                .setButtonText(locale.newNoteModal.cancel)
                .onClick(() => this.close()))
            .addButton((btn) => btn
                .setButtonText(locale.newNoteModal.create)
                .setCta()
                .onClick(() => void this.submit()))

        // When the name was pre-filled from the search input, editing focus
        // goes straight to the folder field. Deferred so the modal's own
        // open/focus handling cannot override it.
        window.setTimeout(() => {
            if(this.initialFileName){
                this.folderInputEl.focus()
            }
            else{
                this.fileNameInputEl.focus()
            }
        }, 0)
    }

    private registerInputKeydown(inputEl: HTMLInputElement): void {
        inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
            // isComposing: do not submit while an IME (e.g. Chinese input) composition is active
            if(e.key === 'Enter' && !e.isComposing){
                e.preventDefault()
                void this.submit()
            }
        })
    }

    private async submit(): Promise<void> {
        const locale = t()
        const folder = this.folderInputEl.value.trim().replace(/^\/+|\/+$/g, '')
        let fileName = this.fileNameInputEl.value.trim()
        // Accept "name.md" typed with the extension
        if(fileName.toLowerCase().endsWith('.md')){
            fileName = fileName.slice(0, -3)
        }

        if(!fileName || FILE_NAME_INVALID_CHARS.test(fileName)){
            new Notice(locale.newNoteModal.invalidFileName)
            return
        }
        if(folder && FOLDER_INVALID_CHARS.test(folder)){
            new Notice(locale.newNoteModal.invalidFileName)
            return
        }

        if(folder){
            const normalizedFolder = normalizePath(folder)
            const existing = this.app.vault.getAbstractFileByPath(normalizedFolder)
            if(!existing){
                try {
                    await this.app.vault.createFolder(normalizedFolder)
                }
                catch (error) {
                    console.error('Home Tab: failed to create folder', error)
                    new Notice(locale.newNoteModal.createFailed)
                    return
                }
            }
            else if(!(existing instanceof TFolder)){
                new Notice(locale.newNoteModal.folderIsFile)
                return
            }
        }

        const filePath = normalizePath(folder ? `${folder}/${fileName}.md` : `${fileName}.md`)
        if(this.app.vault.getAbstractFileByPath(filePath)){
            new Notice(locale.newNoteModal.fileExists)
            return
        }

        try {
            const file = await this.app.vault.create(filePath, '')
            this.close()
            await this.app.workspace.getLeaf('tab').openFile(file)
        }
        catch (error) {
            console.error('Home Tab: failed to create note', error)
            new Notice(locale.newNoteModal.createFailed)
        }
    }

    onClose(): void {
        const { contentEl } = this
        contentEl.empty()
    }
}
