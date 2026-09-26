<script lang="ts">
    import { onMount } from 'svelte';
    import { getAllTags, getIcon, Notice, TFolder, type View } from 'obsidian';
    import type { HomeTabSettings, VaultStatItemKey } from 'src/settings';
    import type HomeTabSearchBar from 'src/homeTabSearchbar';
    import { FolderSearchModal, revealFolderInExplorer } from 'src/folderSearchModal';
    import { t } from '../i18n';
    import { debounce } from '../utils/debounce';

    export let view: View
    export let pluginSettings: HomeTabSettings
    export let HomeTabSearchBar: HomeTabSearchBar
    const app = view.leaf.app

    const statNames: Record<VaultStatItemKey, string> = {
        files: t().setting.vaultStatsFiles.name,
        notes: t().setting.vaultStatsNotes.name,
        attachments: t().setting.vaultStatsAttachments.name,
        folders: t().setting.vaultStatsFolders.name,
        tags: t().setting.vaultStatsTags.name,
    }
    const statIcons: Record<VaultStatItemKey, string> = {
        files: 'files',
        notes: 'file-text',
        attachments: 'paperclip',
        folders: 'folder',
        tags: 'tags',
    }

    let stats: Record<VaultStatItemKey, number> = { files: 0, notes: 0, attachments: 0, folders: 0, tags: 0 }

    // 重新统计全部计数；标签最耗时（每篇笔记读一次 metadata cache），统一走防抖
    function computeStats(): void {
        const files = app.vault.getFiles()
        let notes = 0
        const tags = new Set<string>()
        files.forEach((file) => {
            if(file.extension === 'md'){
                notes++
                getAllTags(app.metadataCache.getFileCache(file))?.forEach((tag) => tags.add(tag.toLowerCase()))
            }
        })
        stats = {
            files: files.length,
            notes,
            attachments: files.length - notes,
            folders: app.vault.getAllLoadedFiles().filter((abstractFile) => abstractFile instanceof TFolder && abstractFile.path !== '/').length,
            tags: tags.size,
        }
    }
    const recalc = debounce(computeStats, 1000)

    onMount(() => {
        computeStats()
        // 库结构变化
        view.registerEvent(app.vault.on('create', recalc))
        view.registerEvent(app.vault.on('delete', recalc))
        view.registerEvent(app.vault.on('rename', recalc))
        // 元数据（标签）变化；'resolved' 覆盖启动时的首次索引
        view.registerEvent(app.metadataCache.on('resolved', recalc))
        view.registerEvent(app.metadataCache.on('changed', recalc))
    })

    // 顺序只由 vaultStatsOrder 决定（与设置页拖拽排序一致），vaultStatsItems 仅表示启用与否
    $: enabledItems = (pluginSettings?.vaultStatsOrder ?? [])
        .filter((key) => key in statNames && pluginSettings?.vaultStatsItems?.includes(key))

    // 聚焦搜索框并激活对应的扩展名/类型过滤器（md / media）
    function activateSearchFilter(filterKey: 'md' | 'media'): void {
        try {
            HomeTabSearchBar?.updateActiveSuggester(filterKey)
            HomeTabSearchBar?.focusSearchbar()
        }
        catch (error) {
            console.error(error)
        }
    }

    // 打开（或聚焦）标签面板
    function openTagPane(): void {
        try {
            const tagLeaves = app.workspace.getLeavesOfType('tag')
            if(tagLeaves.length > 0){
                app.workspace.revealLeaf(tagLeaves[0])
            }
            else{
                const leaf = app.workspace.getLeaf('tab')
                void leaf.setViewState({ type: 'tag' })
            }
        }
        catch (error) {
            console.error(error)
            new Notice(t().ui.tagPaneFailed)
        }
    }

    // 各统计项的点击行为
    const statClickActions: Record<VaultStatItemKey, () => void> = {
        files: () => revealFolderInExplorer(app, undefined, t().ui.folderRevealFailed),
        notes: () => activateSearchFilter('md'),
        attachments: () => activateSearchFilter('media'),
        folders: () => new FolderSearchModal(app, t().ui.folderSearchPlaceholder, t().ui.folderRevealFailed).open(),
        tags: openTagPane,
    }
</script>

<div class="home-tab-vault-stats">
    {#each enabledItems as key (key)}
        <div class="home-tab-vault-stat clickable" role="button" tabindex="0"
            title="{statNames[key]} · {t().common.clickToFilter}"
            on:click={() => statClickActions[key]()}
            on:keydown={(e) => { if(e.key === 'Enter'){ statClickActions[key]() } }}>
            <span class="home-tab-vault-stat-icon">{@html getIcon(statIcons[key])?.outerHTML ?? ''}</span>
            <span class="home-tab-vault-stat-value">{stats[key]}</span>
            <span class="home-tab-vault-stat-name">{statNames[key]}</span>
        </div>
    {/each}
</div>

<style>
    /* 钉在主页偏下方的位置 */
    .home-tab-vault-stats{
        position: absolute;
        bottom: 24px;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 4px 12px;
        color: var(--text-muted);
        font-size: var(--font-ui-small);
    }
    .home-tab-vault-stat{
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        border-radius: var(--radius-s);
        cursor: pointer;
        user-select: none;
        transition: background-color 0.1s ease;
    }
    .home-tab-vault-stat:hover{
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
    }
    .home-tab-vault-stat-icon{
        display: flex;
        align-items: center;
    }
    .home-tab-vault-stat-icon :global(svg){
        width: 14px;
        height: 14px;
    }
    .home-tab-vault-stat-value{
        color: var(--text-normal);
        font-weight: 600;
    }
</style>
