import { App, Modal, Setting } from 'obsidian'
import { t } from './i18n'
import {
    collectVaultFrontmatterFields,
    normalizeFrontmatterFields,
    orderFrontmatterFields,
    TITLE_FIELD,
} from './utils/frontmatterFields'

/**
 * Lets the user choose the frontmatter fields shown as search result rows.
 *
 * The document title is a special field: it is always offered first, it can be
 * turned off, and it can be turned back on at any time. The other candidates
 * come from the frontmatter keys used in the vault; fields that are not in the
 * vault yet can be added by hand.
 */
export class FrontmatterFieldModal extends Modal {
    private selected: string[]
    private readonly onSubmit: (fields: string[]) => void
    private listEl!: HTMLElement
    private manualInputEl: HTMLInputElement | undefined

    constructor(app: App, fields: string[], onSubmit: (fields: string[]) => void) {
        super(app)
        this.selected = orderFrontmatterFields(normalizeFrontmatterFields(fields))
        this.onSubmit = onSubmit
    }

    onOpen(): void {
        const { contentEl } = this
        const locale = t()

        this.titleEl.setText(locale.frontmatterFieldModal.title)
        contentEl.empty()
        contentEl.createEl('h1', { text: locale.frontmatterFieldModal.title })

        this.listEl = contentEl.createDiv()
        this.renderFields()

        // The manual input lives outside the rebuilt list so that typing is not
        // interrupted when the list is re-rendered.
        new Setting(contentEl)
            .setName(locale.frontmatterFieldModal.addManually)
            .setDesc(locale.frontmatterFieldModal.addManuallyDesc)
            .addText((text) => {
                this.manualInputEl = text.inputEl
                text.setPlaceholder(locale.frontmatterFieldModal.fieldPlaceholder)
            })
            .addButton((btn) => btn
                .setButtonText(locale.frontmatterFieldModal.add)
                .onClick(() => this.addManualField()))

        new Setting(contentEl)
            .addButton((btn) => btn
                .setButtonText(locale.frontmatterFieldModal.cancel)
                .onClick(() => this.close()))
            .addButton((btn) => btn
                .setButtonText(locale.frontmatterFieldModal.save)
                .setCta()
                .onClick(() => {
                    this.onSubmit(this.selected)
                    this.close()
                }))
    }

    onClose(): void {
        this.manualInputEl = undefined
        this.contentEl.empty()
    }

    private renderFields(): void {
        const locale = t()
        this.listEl.empty()

        this.listEl.createEl('h3', { text: locale.frontmatterFieldModal.selected })
        if (this.selected.length === 0) {
            this.listEl.createEl('p', { text: locale.frontmatterFieldModal.noSelection })
        }
        this.selected.forEach((field, index) => {
            new Setting(this.listEl)
                .setName(field === TITLE_FIELD ? `${field} · ${locale.frontmatterFieldModal.titleField}` : field)
                .addExtraButton((btn) => btn
                    .setIcon('chevron-up')
                    .setTooltip(locale.frontmatterFieldModal.moveUp)
                    .onClick(() => this.moveField(index, -1)))
                .addExtraButton((btn) => btn
                    .setIcon('chevron-down')
                    .setTooltip(locale.frontmatterFieldModal.moveDown)
                    .onClick(() => this.moveField(index, 1)))
                .addExtraButton((btn) => btn
                    .setIcon('trash-2')
                    .setTooltip(locale.frontmatterFieldModal.remove)
                    .onClick(() => {
                        this.selected.splice(index, 1)
                        this.renderFields()
                    }))
        })

        const candidates = collectVaultFrontmatterFields(this.app)
            .filter(field => !this.selected.includes(field))
        this.listEl.createEl('h3', { text: locale.frontmatterFieldModal.available })
        if (candidates.length === 0) {
            this.listEl.createEl('p', { text: locale.frontmatterFieldModal.noAvailable })
        }
        candidates.forEach((field) => {
            new Setting(this.listEl)
                .setName(field === TITLE_FIELD ? `${field} · ${locale.frontmatterFieldModal.titleField}` : field)
                .addButton((btn) => btn
                    .setButtonText(locale.frontmatterFieldModal.add)
                    .onClick(() => {
                        this.selected = orderFrontmatterFields([...this.selected, field])
                        this.renderFields()
                    }))
        })
    }

    private moveField(index: number, delta: number): void {
        const target = index + delta
        if (target < 0 || target >= this.selected.length) return
        const [moved] = this.selected.splice(index, 1)
        this.selected.splice(target, 0, moved)
        // The document title always stays the first field.
        this.selected = orderFrontmatterFields(this.selected)
        this.renderFields()
    }

    private addManualField(): void {
        const value = this.manualInputEl?.value.trim() ?? ''
        if (!value || this.selected.includes(value)) {
            if (this.manualInputEl) this.manualInputEl.value = ''
            return
        }
        this.selected = orderFrontmatterFields([...this.selected, value])
        if (this.manualInputEl) this.manualInputEl.value = ''
        this.renderFields()
    }
}
