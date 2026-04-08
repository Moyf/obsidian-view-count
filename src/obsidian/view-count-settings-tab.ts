import { App, PluginSettingTab, Setting, requireApiVersion } from "obsidian";
import ViewCountPlugin from "src/main";
import * as ObsidianModule from "obsidian";

import {
	LOG_LEVEL_DEBUG,
	LOG_LEVEL_ERROR,
	LOG_LEVEL_INFO,
	LOG_LEVEL_OFF,
	LOG_LEVEL_TRACE,
	LOG_LEVEL_WARN,
} from "../logger/constants";
import Logger from "js-logger";
import { stringToLogLevel } from "src/logger";

class ViewCountSettingsTab extends PluginSettingTab {
	plugin: ViewCountPlugin;
	icon = "eye";

	constructor(app: App, plugin: ViewCountPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private createSettingsGroup(containerEl: HTMLElement, heading: string) {
		const supportsSettingGroup = requireApiVersion("1.11.0");
		const SettingGroupClass = (
			ObsidianModule as unknown as {
				SettingGroup?: new (el: HTMLElement) => {
					setHeading(text: string | DocumentFragment): {
						addSetting(cb: (setting: Setting) => void): void;
					};
					addSetting(cb: (setting: Setting) => void): void;
				};
			}
		).SettingGroup;

		if (supportsSettingGroup && SettingGroupClass) {
			const group = new SettingGroupClass(containerEl).setHeading(heading);
			return {
				addSetting(cb: (setting: Setting) => void) {
					group.addSetting(cb);
				},
			};
		}

		new Setting(containerEl).setName(heading).setHeading();
		return {
			addSetting(cb: (setting: Setting) => void) {
				const setting = new Setting(containerEl);
				cb(setting);
			},
		};
	}


	display(): void {
		const viewCountCache = this.plugin.viewCountCache;
		if (viewCountCache === null) {
			throw new Error("View count cache is null");
		}

		const { containerEl } = this;

		containerEl.empty();

		const countingGroup = this.createSettingsGroup(containerEl, "Counting rules");
		countingGroup.addSetting((setting) => {
			setting
				.setName("Count method")
				.setDesc("Method used to calculate view counts.")
				.addDropdown((component) =>
					component
						.addOption("unique-days-opened", "Unique days opened")
						.addOption("total-times-opened", "Total times opened")
						.setValue(this.plugin.settings.countMethod)
						.onChange(async (value) => {
							this.plugin.settings.countMethod = value as
								| "unique-days-opened"
								| "total-times-opened";
							await this.plugin.saveSettings();
							if (this.plugin.settings.syncToFrontmatter) {
								await viewCountCache.syncPropertiesToFrontmatter();
							}
							await viewCountCache.debounceRefresh();
							this.display();
						})
				);
		});

		countingGroup.addSetting((setting) => {
			setting
				.setName("Excluded paths")
				.setDesc(
					"Folder paths to exclude from view count tracking. Separate by commas, e.g. folder1,folder2"
				)
				.addText((component) =>
					component
						.setValue(this.plugin.settings.excludedPaths.join(","))
						.onChange(async (value) => {
							this.plugin.settings.excludedPaths = value
								.split(",")
								.map((v) => v.trim())
								.filter((v) => v.length > 0);
							await this.plugin.saveSettings();
						})
				);
		});

		const newNoteGroup = this.createSettingsGroup(containerEl, "New note behavior");
		newNoteGroup.addSetting((setting) => {
			setting
				.setName("Skip new notes")
				.setDesc(
					"When enabled, new note first open will skip count increment and frontmatter writes."
				)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings.skipNewNotes)
						.onChange(async (value) => {
							this.plugin.settings.skipNewNotes = value;
							await this.plugin.saveSettings();
							this.display();
						})
				);
		});

		newNoteGroup.addSetting((setting) => {
			setting
				.setName("Templater delay")
				.setDesc(
					"Delay before frontmatter write on new-note first open. Useful when Templater is enabled."
				)
				.addDropdown((cb) => {
					cb.addOptions({
						"0": "0",
						"1000": "1000",
						"2000": "2000",
						"3000": "3000",
						"4000": "4000",
						"5000": "5000",
					});
					cb.setValue(this.plugin.settings.templaterDelay.toString()).onChange(
						async (value) => {
							this.plugin.settings.templaterDelay = parseInt(value);
							await this.plugin.saveSettings();
						}
					);
				});
		});

		const frontmatterGroup = this.createSettingsGroup(containerEl, "Frontmatter sync");
		frontmatterGroup.addSetting((setting) => {
			setting
				.setName("Sync view count")
				.setDesc(
					"Write view count from cache to frontmatter for existing notes."
				)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings.syncToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.syncToFrontmatter = value;
							await this.plugin.saveSettings();
							await viewCountCache.syncPropertiesToFrontmatter();
							this.display();
						})
				);
		});

		const viewCountDesc = new DocumentFragment();
		viewCountDesc.createDiv({
			text: "Property name for view count.",
		});
		viewCountDesc.createEl("br");
		viewCountDesc.createDiv({
			text: "Rename existing property first in All Properties view before changing this value.",
			cls: "view-count-text--emphasize",
		});

		frontmatterGroup.addSetting((setting) => {
			setting
				.setName("View count property name")
				.setDesc(viewCountDesc)
				.addText((text) => {
					text
						.setValue(this.plugin.settings.propertyName)
						.setDisabled(!this.plugin.settings.syncToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.propertyName = value;
							await this.plugin.saveSettings();
						});
				});
		});

		frontmatterGroup.addSetting((setting) => {
			setting
				.setName("Sync view date")
				.setDesc(
					"Write last viewed date to frontmatter for existing notes."
				)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings.syncViewDateToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.syncViewDateToFrontmatter = value;
							await this.plugin.saveSettings();
							await viewCountCache.syncPropertiesToFrontmatter();
							this.display();
						})
				);
		});

		const viewDatePropertyDesc = new DocumentFragment();
		viewDatePropertyDesc.createDiv({
			text: "Property name for viewed date.",
		});
		viewDatePropertyDesc.createEl("br");
		viewDatePropertyDesc.createDiv({
			text: "Rename existing property first in All Properties view before changing this value.",
			cls: "view-count-text--emphasize",
		});

		frontmatterGroup.addSetting((setting) => {
			setting
				.setName("Viewed date property name")
				.setDesc(viewDatePropertyDesc)
				.addText((text) => {
					text
						.setValue(this.plugin.settings.viewDatePropertyName)
						.setDisabled(!this.plugin.settings.syncViewDateToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.viewDatePropertyName = value;
							await this.plugin.saveSettings();
						});
				});
		});

		frontmatterGroup.addSetting((setting) => {
			setting
				.setName("Viewed date format")
				.setDesc("Moment.js format. Examples: YYYY-MM-DD, YYYY/MM/DD HH:mm")
				.addText((text) => {
					text
						.setPlaceholder("YYYY-MM-DD")
						.setValue(this.plugin.settings.viewDateFormat)
						.setDisabled(!this.plugin.settings.syncViewDateToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.viewDateFormat = value || "YYYY-MM-DD";
							await this.plugin.saveSettings();
						});
				});
		});

		const debugGroup = this.createSettingsGroup(containerEl, "Debugging");
		debugGroup.addSetting((setting) => {
			setting
				.setName("Log level")
				.setDesc("Set the log level. Use trace to see all log messages.")
				.addDropdown((cb) => {
					cb.addOptions({
						[LOG_LEVEL_OFF]: "Off",
						[LOG_LEVEL_ERROR]: "Error",
						[LOG_LEVEL_WARN]: "Warn",
						[LOG_LEVEL_INFO]: "Info",
						[LOG_LEVEL_DEBUG]: "Debug",
						[LOG_LEVEL_TRACE]: "Trace",
					});
					cb.setValue(this.plugin.settings.logLevel).onChange(
						async (value) => {
							this.plugin.settings.logLevel = value;
							await this.plugin.saveSettings();
							Logger.setLevel(stringToLogLevel(value));
						}
					);
				});
		});
	}
}

export default ViewCountSettingsTab;
