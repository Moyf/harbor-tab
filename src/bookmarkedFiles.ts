import { Component, Notice, TAbstractFile, TFile, type App, type BookmarkItem, type BookmarksPlugin, type IconName } from "obsidian";
import { get, type Writable } from "svelte/store";
import type HomeTab from "./main";

export interface bookmarkedFileStore{
    filepath: string
    iconId: IconName | undefined
}
export interface bookmarkedFile{
    file: TFile
    iconId: IconName | undefined
}

export class bookmarkedFilesManager extends Component{
    private app: App
    private plugin: HomeTab
    private bookmarkedFilesStore: Writable<bookmarkedFile[]>

    constructor(app: App, plugin: HomeTab, bookmarkedFilesStore: Writable<bookmarkedFile[]>){
        super()

        this.app = app
        this.plugin = plugin
        this.bookmarkedFilesStore = bookmarkedFilesStore
    }

    onload(): void{
        // Load stored bookmarked files, then check if they've changed
        this.loadStoredBookmarkedFiles()
        this.updateBookmarkedFiles()
        // Update stored bookmarked files list when a file is bookmarked or unbookmarked
        const bookmarksPlugin = this.app.internalPlugins.getPluginById('bookmarks')
        if(bookmarksPlugin){
            this.registerEvent(bookmarksPlugin.instance.on('changed', () => this.updateBookmarkedFiles()))
        }
    }

    private updateBookmarkedFiles(): void{
        const bookmarkedFiles = this.getBookmarkedFiles()
        
        this.bookmarkedFilesStore.update((filesArray) => {
            const updatedArray: bookmarkedFile[] = []

            bookmarkedFiles.forEach((bookmarkedFile) => {
                updatedArray.push({
                    file: bookmarkedFile,
                    // Retrieve icon from stored array
                    iconId: filesArray.find((item) => item.file === bookmarkedFile)?.iconId ?? undefined
                })
            })
            
            return updatedArray
        })

        void this.storeBookmarkedFiles()
    }

    public updateFileIcon(file: TFile, iconId: IconName): void{
        this.bookmarkedFilesStore.update((filesArray) => {
            const itemIndex = filesArray.findIndex((item) => item.file === file)
            filesArray[itemIndex].iconId = iconId
            return filesArray
        })

        void this.storeBookmarkedFiles()
    }

    private getBookmarkedFiles(): TFile[]{
        if(this.app.internalPlugins.getPluginById('bookmarks')){
            const bookmarkedItems = this.app.internalPlugins.plugins.bookmarks.instance.getBookmarks()
            const bookmarkedFiles: TFile[] = []
    
            bookmarkedItems.forEach((item: BookmarkItem) => {
                if (item.type === 'file'){
                    const file = this.app.vault.getAbstractFileByPath(item.path)
                    if (file instanceof TFile){
                        bookmarkedFiles.push(file)
                    }
                }
            })
            return bookmarkedFiles
        }
        return []
    }

    private async storeBookmarkedFiles(): Promise<void>{
        if(this.app.internalPlugins.getPluginById('bookmarks')){
            let storeObj: bookmarkedFileStore[] = []
            get(this.bookmarkedFilesStore).forEach((item) => storeObj.push({
                filepath: item.file.path, // Store only the path instead of the entire TFile instance
                iconId: item.iconId
            }))
            this.plugin.settings.bookmarkedFileStore = storeObj
            await this.plugin.saveData(this.plugin.settings)
        }
    }

    private loadStoredBookmarkedFiles(): void{
        if(this.app.internalPlugins.getPluginById('bookmarks')){
            let filesToLoad: bookmarkedFile[] = []
            this.app.workspace.onLayoutReady(() => {
                this.plugin.settings.bookmarkedFileStore.forEach((item) => {
                    let file: TAbstractFile | null = this.app.vault.getAbstractFileByPath(item.filepath)
                    if(file && file instanceof TFile){
                        filesToLoad.push({
                            file: file,
                            iconId: item.iconId
                        })
                    }
                })
                this.bookmarkedFilesStore.set(filesToLoad)   
            })
        }
    }

    public removeBookmark = (file: TFile) => {
        const bookmarksPlugin: BookmarksPlugin | undefined = this.app.internalPlugins.getPluginById('bookmarks')
        if(bookmarksPlugin){
            const item: BookmarkItem | undefined = bookmarksPlugin.instance.getBookmarks().find(item => item.path === file.path)
            if(item) this.app.internalPlugins.plugins.bookmarks.instance.removeItem(item)
        }
        else{
            new Notice("Bookmarks plugin is not enabled")
        }
    }

    /**
     * Group paths (bookmark group titles joined with "/") for every bookmarked
     * file path. A file bookmarked in several groups maps to several paths.
     * The bookmarks plugin stores a tree: "group" items have a title and child
     * items; nested group paths are the ancestor titles joined with "/".
     */
    public getFileGroupPaths(): Map<string, string[]>{
        const result = new Map<string, string[]>()
        const bookmarksPlugin = this.app.internalPlugins.getPluginById('bookmarks')
        if(!bookmarksPlugin) return result

        const visit = (items: BookmarkItem[], prefix: string): void => {
            items.forEach((item) => {
                if(item.type === 'group' && item.items){
                    const title = item.title ?? ''
                    visit(item.items, prefix ? `${prefix}/${title}` : title)
                }
                else if(item.type === 'file'){
                    const paths = result.get(item.path) ?? []
                    paths.push(prefix)
                    result.set(item.path, paths)
                }
            })
        }
        visit(bookmarksPlugin.instance.items ?? [], '')
        return result
    }

    /** Selected bookmark group paths from the settings (trim + drop empties) */
    private getSelectedGroups(): string[]{
        return (this.plugin.settings.bookmarkedGroups ?? '')
            .split(',')
            .map((group) => group.trim())
            .filter((group) => group !== '')
    }

    /**
     * Keeps only the bookmarked files inside the groups selected in the
     * settings; when no group is selected every bookmark is kept. Selecting a
     * group also keeps its nested subgroups.
     */
    public filterBySelectedGroups(files: bookmarkedFile[]): bookmarkedFile[]{
        const selectedGroups = this.getSelectedGroups()
        if(selectedGroups.length === 0) return files

        const groupPaths = this.getFileGroupPaths()
        return files.filter((entry) => (groupPaths.get(entry.file.path) ?? [])
            .some((groupPath) => selectedGroups.some((selected) => groupPath === selected || groupPath.startsWith(`${selected}/`))))
    }
}