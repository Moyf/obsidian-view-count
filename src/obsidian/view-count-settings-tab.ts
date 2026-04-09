import {
	App,
	PluginSettingTab,
	Setting,
	requireApiVersion,
	getLanguage,
} from "obsidian";
import ViewCountPlugin from "src/main";
import * as ObsidianModule from "obsidian";
import type { DefaultOpenMode } from "src/types";

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
		"group.newNote": "新笔记行为",
		"group.frontmatter": "属性同步",
		"group.stats": "浏览统计",
		"group.debug": "调试",
		"setting.countMethod.name": "计数方式",
		"setting.countMethod.desc": "用于计算浏览次数的方法。",
		"setting.displayNameProperty.name": "显示名称属性",
		"setting.displayNameProperty.desc": "面板里优先使用该元数据属性作为笔记名称，缺失时回退到文件名。",
		"setting.defaultOpenMode.name": "默认打开方式",
		"setting.defaultOpenMode.desc": "点击面板中的笔记时，默认如何打开。",
		"setting.recentFallbackModified.name": "兼容修改时间",
		"setting.recentFallbackModified.desc": "当笔记没有找到查看时间属性时，使用其修改时间作为查看时间。启用后，最近查看会先尝试修改时间属性，最后回退到文件本身修改时间。仅影响查看，不会写入属性。",
		"setting.recentModifiedProp.name": "修改时间属性",
		"setting.recentModifiedProp.desc": "用于读取修改时间的元数据属性。仅影响查看，不会写入。",
		"option.open.current": "替换当前标签页",
		"option.open.tab": "新标签页",
		"option.open.window": "新窗口",
		"option.open.splitRight": "右侧分栏",
		"option.open.splitDown": "下方分栏",
		"option.uniqueDays": "按打开天数去重",
		"option.totalTimes": "总打开次数",
		"setting.excludedPaths.name": "排除路径",
		"setting.excludedPaths.desc": "要排除统计的文件夹路径。支持英文逗号或换行分隔。",
		"setting.skipNewNotes.name": "跳过新笔记",
		"setting.skipNewNotes.desc": "启用后，新建笔记首次打开会跳过计数和元数据写入。",
		"setting.templaterDelay.name": "Templater 延迟",
		"setting.templaterDelay.desc": "新笔记首次打开时写入元数据前的等待时间（适用于 Templater）。",
		"setting.syncViewCount.name": "同步浏览次数",
		"setting.syncViewCount.desc": "将缓存中的浏览次数写入现有笔记元数据。",
		"setting.viewCountProp.name": "浏览次数属性名",
		"setting.viewCountProp.desc1": "用于保存浏览次数的元数据属性名。",
		"setting.viewCountProp.desc2": "修改前请先在 All Properties 里重命名已有属性。",
		"setting.syncViewDate.name": "同步查看日期",
		"setting.syncViewDate.desc": "将最后查看日期写入现有笔记元数据。",
		"setting.viewDateProp.name": "查看日期属性名",
		"setting.viewDateProp.desc1": "用于保存查看日期的元数据属性名。",
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

	private createSettingsGroup(containerEl: HTMLElement, heading?: string) {
		const supportsSettingGroup = requireApiVersion("1.11.0");
		const SettingGroupClass = (
			ObsidianModule as unknown as {
				SettingGroup?: new (el: HTMLElement) => {
					setHeading?(text: string | DocumentFragment): {
						addSetting(cb: (setting: Setting) => void): void;
					};
					addSetting(cb: (setting: Setting) => void): void;
				};
			}
		).SettingGroup;

		if (supportsSettingGroup && SettingGroupClass) {
			const groupInstance = new SettingGroupClass(containerEl);
			const group =
				heading && groupInstance.setHeading
					? groupInstance.setHeading(heading)
					: groupInstance;
			return {
				addSetting(cb: (setting: Setting) => void) {
					group.addSetting(cb);
				},
			};
		}

		if (heading) {
			new Setting(containerEl).setName(heading).setHeading();
		}
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

		const generalGroup = this.createSettingsGroup(containerEl);

		generalGroup.addSetting((setting) => {
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
								await viewCountCache.syncViewCountToFrontmatterOnly();
							}
							await viewCountCache.debounceRefresh();
							this.display();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.displayNameProperty.name", "Display name property"))
				.setDesc(
					this.t(
						"setting.displayNameProperty.desc",
						"Use this metadata property as note title in panel lists. Fallback to filename when missing."
					)
				)
				.addText((component) =>
					component
						.setPlaceholder("title")
						.setValue(this.plugin.settings.displayNameProperty)
						.onChange(async (value) => {
							this.plugin.settings.displayNameProperty = value.trim() || "title";
							await this.plugin.saveSettings();
							await viewCountCache.debounceRefresh();
						})
				);
		});

		generalGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.excludedPaths.name", "Excluded paths"))
				.setDesc(
					this.t(
						"setting.excludedPaths.desc",
						"Folder paths to exclude from view count tracking. Use commas or new lines as separators."
					)
				)
				.addTextArea((component) =>
					component
						.setValue(this.plugin.settings.excludedPaths.join("\n"))
						.setPlaceholder("folder1\nfolder2,folder3")
						.onChange(async (value) => {
							this.plugin.settings.excludedPaths = value
								.split(/[\r\n,]+/)
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
						"When enabled, new note first open will skip count increment and metadata writes."
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
						"Delay before metadata write on new-note first open. Useful when Templater is enabled."
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
			this.t("group.frontmatter", "Metadata sync")
		);
		frontmatterGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.syncViewCount.name", "Sync view count"))
				.setDesc(
					this.t(
						"setting.syncViewCount.desc",
						"Write view count from cache to metadata for existing notes."
					)
				)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings.syncToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.syncToFrontmatter = value;
							await this.plugin.saveSettings();
							await viewCountCache.syncViewCountToFrontmatterOnly();
							this.display();
						})
				);
		});

		const viewCountDesc = new DocumentFragment();
		viewCountDesc.createDiv({
			text: this.t(
				"setting.viewCountProp.desc1",
				"Metadata property name for view count."
			),
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
						"Write last viewed date to metadata for existing notes."
					)
				)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings.syncViewDateToFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.syncViewDateToFrontmatter = value;
							await this.plugin.saveSettings();
							await viewCountCache.syncViewDateToFrontmatterOnly();
							this.display();
						})
				);
		});

		const viewDatePropertyDesc = new DocumentFragment();
		viewDatePropertyDesc.createDiv({
			text: this.t(
				"setting.viewDateProp.desc1",
				"Metadata property name for viewed date."
			),
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

		const statsGroup = this.createSettingsGroup(
			containerEl,
			this.t("group.stats", "View statistics")
		);

		statsGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.defaultOpenMode.name", "Default open mode"))
				.setDesc(
					this.t(
						"setting.defaultOpenMode.desc",
						"How to open notes when clicked in the panel."
					)
				)
				.addDropdown((component) =>
					component
						.addOption("current", this.t("option.open.current", "Replace current tab"))
						.addOption("tab", this.t("option.open.tab", "New tab"))
						.addOption("window", this.t("option.open.window", "New window"))
						.addOption("split-right", this.t("option.open.splitRight", "Split right"))
						.addOption("split-down", this.t("option.open.splitDown", "Split down"))
						.setValue(this.plugin.settings.defaultOpenMode)
						.onChange(async (value) => {
							this.plugin.settings.defaultOpenMode = value as DefaultOpenMode;
							await this.plugin.saveSettings();
						})
				);
		});

		statsGroup.addSetting((setting) => {
			setting
				.setName(this.t("setting.recentFallbackModified.name", "Fallback to modified time"))
				.setDesc(
					this.t(
						"setting.recentFallbackModified.desc",
						"When enabled, if Recent cannot find viewed date property, it falls back to modified-date property, then file modified time. This only affects display and never writes properties."
					)
				)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings.recentFallbackToModifiedTime)
						.onChange(async (value) => {
							this.plugin.settings.recentFallbackToModifiedTime = value;
							await this.plugin.saveSettings();
							await viewCountCache.debounceRefresh();
							this.display();
						})
				);
		});

		if (this.plugin.settings.recentFallbackToModifiedTime) {
			statsGroup.addSetting((setting) => {
				setting
					.setName(this.t("setting.recentModifiedProp.name", "Modified time property"))
					.setDesc(
						this.t(
							"setting.recentModifiedProp.desc",
							"Metadata property used for modified time lookup. This only affects display and never writes."
						)
					)
					.addText((component) =>
						component
							.setPlaceholder("modified_at")
							.setValue(this.plugin.settings.recentModifiedTimePropertyName)
							.onChange(async (value) => {
								this.plugin.settings.recentModifiedTimePropertyName = value.trim();
								await this.plugin.saveSettings();
								await viewCountCache.debounceRefresh();
							})
					);
			});
		}

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
