import {
	App,
	PluginSettingTab,
	Setting,
	requireApiVersion,
	getLanguage,
} from "obsidian";
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
	private readonly locale = getLanguage();

	private readonly zhCN: Record<string, string> = {
		"group.counting": "计数规则",
		"group.newNote": "新笔记行为",
		"group.frontmatter": "Frontmatter 同步",
		"group.debug": "调试",
		"setting.countMethod.name": "计数方式",
		"setting.countMethod.desc": "用于计算浏览次数的方法。",
		"option.uniqueDays": "按打开天数去重",
		"option.totalTimes": "总打开次数",
		"setting.excludedPaths.name": "排除路径",
		"setting.excludedPaths.desc": "要排除统计的文件夹路径，逗号分隔，例如 folder1,folder2",
		"setting.skipNewNotes.name": "跳过新笔记",
		"setting.skipNewNotes.desc": "启用后，新建笔记首次打开会跳过计数和 frontmatter 写入。",
		"setting.templaterDelay.name": "Templater 延迟",
		"setting.templaterDelay.desc": "新笔记首次打开时写入 frontmatter 前的等待时间（适用于 Templater）。",
		"setting.syncViewCount.name": "同步浏览次数",
		"setting.syncViewCount.desc": "将缓存中的浏览次数写入现有笔记 frontmatter。",
		"setting.viewCountProp.name": "浏览次数属性名",
		"setting.viewCountProp.desc1": "用于保存浏览次数的 frontmatter 属性名。",
		"setting.viewCountProp.desc2": "修改前请先在 All Properties 里重命名已有属性。",
		"setting.syncViewDate.name": "同步查看日期",
		"setting.syncViewDate.desc": "将最后查看日期写入现有笔记 frontmatter。",
		"setting.viewDateProp.name": "查看日期属性名",
		"setting.viewDateProp.desc1": "用于保存查看日期的 frontmatter 属性名。",
		"setting.viewDateProp.desc2": "修改前请先在 All Properties 里重命名已有属性。",
		"setting.viewDateFormat.name": "查看日期格式",
		"setting.viewDateFormat.desc": "Moment.js 格式，例如：YYYY-MM-DD、YYYY/MM/DD HH:mm",
		"setting.logLevel.name": "日志级别",
		"setting.logLevel.desc": "设置日志级别；选择 trace 可查看全部日志。",
		"log.off": "关闭",
		"log.error": "错误",
		"log.warn": "警告",
		"log.info": "信息",
		"log.debug": "调试",
		"log.trace": "追踪",
	};

	private t(key: string, en: string): string {
		if (this.locale === "zh-CN" || this.locale.startsWith("zh")) {
			return this.zhCN[key] ?? en;
		}
		return en;
	}

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

		const countingGroup = this.createSettingsGroup(
			containerEl,
			this.t("group.counting", "Counting rules")
		);
		countingGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.countMethod.name", "Count method"))
				.setDesc(this.t("setting.countMethod.desc", "Method used to calculate view counts."))
				.addDropdown((component) =>
					component
						.addOption("unique-days-opened", this.t("option.uniqueDays", "Unique days opened"))
						.addOption("total-times-opened", this.t("option.totalTimes", "Total times opened"))
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
				.setName(this.t("setting.excludedPaths.name", "Excluded paths"))
				.setDesc(
					this.t(
						"setting.excludedPaths.desc",
						"Folder paths to exclude from view count tracking. Separate by commas, e.g. folder1,folder2"
					)
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

		const newNoteGroup = this.createSettingsGroup(
			containerEl,
			this.t("group.newNote", "New note behavior")
		);
		newNoteGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.skipNewNotes.name", "Skip new notes"))
				.setDesc(
					this.t(
						"setting.skipNewNotes.desc",
						"When enabled, new note first open will skip count increment and frontmatter writes."
					)
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
				.setName(this.t("setting.templaterDelay.name", "Templater delay"))
				.setDesc(
					this.t(
						"setting.templaterDelay.desc",
						"Delay before frontmatter write on new-note first open. Useful when Templater is enabled."
					)
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

		const frontmatterGroup = this.createSettingsGroup(
			containerEl,
			this.t("group.frontmatter", "Frontmatter sync")
		);
		frontmatterGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.syncViewCount.name", "Sync view count"))
				.setDesc(
					this.t(
						"setting.syncViewCount.desc",
						"Write view count from cache to frontmatter for existing notes."
					)
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
			text: this.t("setting.viewCountProp.desc1", "Property name for view count."),
		});
		viewCountDesc.createEl("br");
		viewCountDesc.createDiv({
			text: this.t(
				"setting.viewCountProp.desc2",
				"Rename existing property first in All Properties view before changing this value."
			),
			cls: "view-count-text--emphasize",
		});

		frontmatterGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.viewCountProp.name", "View count property name"))
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
				.setName(this.t("setting.syncViewDate.name", "Sync view date"))
				.setDesc(
					this.t(
						"setting.syncViewDate.desc",
						"Write last viewed date to frontmatter for existing notes."
					)
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
			text: this.t("setting.viewDateProp.desc1", "Property name for viewed date."),
		});
		viewDatePropertyDesc.createEl("br");
		viewDatePropertyDesc.createDiv({
			text: this.t(
				"setting.viewDateProp.desc2",
				"Rename existing property first in All Properties view before changing this value."
			),
			cls: "view-count-text--emphasize",
		});

		frontmatterGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.viewDateProp.name", "Viewed date property name"))
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
				.setName(this.t("setting.viewDateFormat.name", "Viewed date format"))
				.setDesc(this.t("setting.viewDateFormat.desc", "Moment.js format. Examples: YYYY-MM-DD, YYYY/MM/DD HH:mm"))
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

		const debugGroup = this.createSettingsGroup(
			containerEl,
			this.t("group.debug", "Debugging")
		);
		debugGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.logLevel.name", "Log level"))
				.setDesc(this.t("setting.logLevel.desc", "Set the log level. Use trace to see all log messages."))
				.addDropdown((cb) => {
					cb.addOptions({
						[LOG_LEVEL_OFF]: this.t("log.off", "Off"),
						[LOG_LEVEL_ERROR]: this.t("log.error", "Error"),
						[LOG_LEVEL_WARN]: this.t("log.warn", "Warn"),
						[LOG_LEVEL_INFO]: this.t("log.info", "Info"),
						[LOG_LEVEL_DEBUG]: this.t("log.debug", "Debug"),
						[LOG_LEVEL_TRACE]: this.t("log.trace", "Trace"),
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
