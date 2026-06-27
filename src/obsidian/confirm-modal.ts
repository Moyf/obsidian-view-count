import { App, ButtonComponent, Modal } from "obsidian";

export interface ConfirmModalOptions {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	isWarning?: boolean;
	onConfirm?: () => void | Promise<void>;
	onCancel?: () => void;
}

export class ConfirmModal extends Modal {
	private confirmed = false;

	constructor(app: App, private options: ConfirmModalOptions) {
		super(app);
	}

	onOpen() {
		const { title, message, confirmText, cancelText, isWarning } = this.options;

		this.titleEl.setText(title);
		const messageEl = this.contentEl.createEl("p", {
			text: message,
			cls: "view-count-modal-message",
		});
		messageEl.style.whiteSpace = "pre-wrap";

		const buttonContainer = this.contentEl.createDiv({
			cls: "view-count-modal-buttons",
		});
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "var(--size-4-2)";
		buttonContainer.style.marginTop = "var(--size-4-3)";

		new ButtonComponent(buttonContainer)
			.setButtonText(cancelText ?? "Cancel")
			.onClick(() => {
				this.close();
			});

		const confirmButton = new ButtonComponent(buttonContainer)
			.setButtonText(confirmText ?? "Confirm")
			.onClick(() => {
				this.confirmed = true;
				this.close();
			});
		if (isWarning) {
			confirmButton.setWarning();
		} else {
			confirmButton.setCta();
		}
	}

	onClose() {
		if (this.confirmed) {
			this.options.onConfirm?.();
		} else {
			this.options.onCancel?.();
		}
	}
}
