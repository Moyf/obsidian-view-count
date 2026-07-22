import { App, ButtonComponent, Modal, Setting } from "obsidian";

export interface ImportFrontmatterModalOptions {
	defaultCountProperty: string;
	defaultDateProperty: string;
	onImport: (countProperty: string, dateProperty: string) => void | Promise<void>;
}

export class ImportFrontmatterModal extends Modal {
	private countProperty: string;
	private dateProperty: string;
	private options: ImportFrontmatterModalOptions;

	constructor(app: App, options: ImportFrontmatterModalOptions) {
		super(app);
		this.options = options;
		this.countProperty = options.defaultCountProperty;
		this.dateProperty = options.defaultDateProperty;
	}

	onOpen() {
		this.titleEl.setText("Import frontmatter to cache");

		this.contentEl.createEl("p", {
			text: "Specify the frontmatter property names to read from. Pre-populated from your current settings, but you can change them to import from a different plugin.",
			cls: "view-count-modal-message",
		});

		new Setting(this.contentEl)
			.setName("View count property")
			.setDesc("Frontmatter property name containing the view count number.")
			.addText((text) =>
				text
					.setValue(this.countProperty)
					.setPlaceholder("views")
					.onChange((value) => {
						this.countProperty = value.trim();
					})
			);

		new Setting(this.contentEl)
			.setName("View date property")
			.setDesc("Frontmatter property name containing the last viewed date. Leave empty to skip.")
			.addText((text) =>
				text
					.setValue(this.dateProperty)
					.setPlaceholder("viewed_at")
					.onChange((value) => {
						this.dateProperty = value.trim();
					})
			);

		const buttonContainer = this.contentEl.createDiv({
			cls: "view-count-modal-buttons",
		});
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "var(--size-4-2)";
		buttonContainer.style.marginTop = "var(--size-4-3)";

		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				this.close();
			});

		new ButtonComponent(buttonContainer)
			.setButtonText("Import")
			.setCta()
			.onClick(() => {
				this.close();
				this.options.onImport(this.countProperty, this.dateProperty);
			});
	}
}
