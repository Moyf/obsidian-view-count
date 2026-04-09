<script lang="ts">
	import { Menu, getLanguage } from "obsidian";
	import type { TFile } from "obsidian";
	import { onMount } from "svelte";
	import _ from "lodash";
	import store from "./store";
	import EventManager from "src/event/event-manager";
	import { shouldTrackFile } from "src/storage/utils";
	import type { ViewCountEntry } from "src/storage/types";
	import ViewsView from "./components/views-view.svelte";
	import TrendsView from "./components/trends-view.svelte";
	import RecentView from "./components/recent-view.svelte";
	import type {
		MostViewedRenderItem,
		TrendingRenderItem,
		RecentViewedRenderItem,
	} from "./types";
	import IconButton from "./components/icon-button.svelte";
	import type ViewCountPlugin from "src/main";
	import "./styles.css";
	import { TimePeriod, TView } from "src/types";
	import type { CountMethod, ItemCount } from "src/types";

	const locale = getLanguage();
	const isZh = locale === "zh-CN" || locale.startsWith("zh");

	type TranslationKey =
		| "tab.views"
		| "tab.trends"
		| "tab.recent"
		| "action.itemCount"
		| "action.timePeriod"
		| "action.search"
		| "action.panelCountMethod"
		| "action.recentViewedAtFallback"
		| "action.searchPathToggle"
		| "empty"
		| "placeholder.search"
		| "method.uniqueDays"
		| "method.totalTimes"
		| "period.3days"
		| "period.7days"
		| "period.14days"
		| "period.30days"
		| "period.today"
		| "period.week"
		| "period.weekIso"
		| "period.month"
		| "recent.today"
		| "recent.yesterday"
		| "recent.dayBeforeYesterday"
		| "recent.daysAgo";

	const zhCN: Record<TranslationKey, string> = {
		"tab.views": "查看次数",
		"tab.trends": "查看趋势",
		"tab.recent": "最近查看",
		"action.itemCount": "显示条目数",
		"action.timePeriod": "趋势时间范围",
		"action.search": "搜索笔记",
		"action.panelCountMethod": "面板计数方式",
		"action.recentViewedAtFallback": "兼容修改时间",
		"empty": "暂时没有可显示的笔记。",
		"action.searchPathToggle": "同时搜索路径",
		"placeholder.search": "搜索标题或文件名",
		"method.uniqueDays": "按打开天数去重",
		"method.totalTimes": "总打开次数",
		"period.3days": "最近 3 天",
		"period.7days": "最近 7 天",
		"period.14days": "最近 14 天",
		"period.30days": "最近 30 天",
		"period.today": "今天",
		"period.week": "本周",
		"period.weekIso": "本周（ISO）",
		"period.month": "本月",
		"recent.today": "今天",
		"recent.yesterday": "昨天",
		"recent.dayBeforeYesterday": "前天",
		"recent.daysAgo": "天前",
	};

	const enUS: Record<TranslationKey, string> = {
		"tab.views": "Views (Total)",
		"tab.trends": "Trends",
		"tab.recent": "Recent",
		"action.itemCount": "Item count",
		"action.timePeriod": "Time period",
		"action.search": "Search notes",
		"action.panelCountMethod": "Panel count method",
		"action.recentViewedAtFallback": "Use modified-time fallback",
		"empty": "No notes with view count found.",
		"action.searchPathToggle": "Search paths too",
		"placeholder.search": "Search title or filename",
		"method.uniqueDays": "Unique days opened",
		"method.totalTimes": "Total times opened",
		"period.3days": "3 days",
		"period.7days": "7 days",
		"period.14days": "14 days",
		"period.30days": "30 days",
		"period.today": "Today",
		"period.week": "This week",
		"period.weekIso": "This week iso",
		"period.month": "This month",
		"recent.today": "Today",
		"recent.yesterday": "Yesterday",
		"recent.dayBeforeYesterday": "Day before yesterday",
		"recent.daysAgo": "days ago",
	};

	function t(key: TranslationKey) {
		return isZh ? zhCN[key] : enUS[key];
	}

	function getDisplayName(file: TFile): string {
		const propertyName = plugin.settings.displayNameProperty?.trim();
		if (!propertyName) {
			return file.extension == "md" ? file.basename : file.name;
		}

		const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
		const rawValue = frontmatter?.[propertyName];

		if (typeof rawValue === "string" && rawValue.trim().length > 0) {
			return rawValue.trim();
		}

		if (typeof rawValue === "number" || typeof rawValue === "boolean") {
			return String(rawValue);
		}

		if (Array.isArray(rawValue) && rawValue.length > 0) {
			return rawValue.map((v) => String(v)).join(", ");
		}

		return file.extension == "md" ? file.basename : file.name;
	}

	let currentView: TView = TView.RECENT;
	let viewRenderItems: MostViewedRenderItem[] = [];
	let trendRenderItems: TrendingRenderItem[] = [];
	let recentRenderItems: RecentViewedRenderItem[] = [];

	let timePeriod: TimePeriod;
	let itemCount: ItemCount;
	let plugin: ViewCountPlugin;
	let panelCountMethod: CountMethod = "unique-days-opened";
	let isSearchExpanded = false;
	let preferViewedAtInRecent = false;
	let searchQuery = "";
	let searchInPath = false;
	let searchInputEl: HTMLInputElement | null = null;

	const saveSettingsDebounced = _.debounce(async () => {
		plugin.settings.itemCount = itemCount;
		plugin.settings.timePeriod = timePeriod;
		plugin.settings.currentView = currentView;
		await plugin.saveSettings();
	}, 300);

	store.plugin.subscribe((p) => {
		plugin = p;

		itemCount = plugin.settings.itemCount;
		timePeriod = plugin.settings.timePeriod;
		currentView = plugin.settings.currentView;
		panelCountMethod = plugin.settings.countMethod;

		updateViewItems();
		updateTrendItems();
		updateRecentItems();
	});

	onMount(() => {
		//TODO optimize event. Don't update all items?
		function handleRefresh() {
			updateViewItems();
			updateTrendItems();
			updateRecentItems();
		}

		EventManager.getInstance().on("refresh-item-view", handleRefresh);
		return () => {
			EventManager.getInstance().off("refresh-item-view", handleRefresh);
		};
	});

	function updateViewItems() {
		const sortedEntries = [...plugin.viewCountCache!.getEntries()].sort(
			(a, b) =>
				plugin.viewCountCache!.getViewCountForEntryByMethod(
					b,
					panelCountMethod,
				) -
				plugin.viewCountCache!.getViewCountForEntryByMethod(
					a,
					panelCountMethod,
				),
		);

		const entryFiles: Map<ViewCountEntry, TFile> = new Map();
		sortedEntries.forEach((entry) => {
			const file = plugin.app.vault.getFileByPath(entry.path);
			if (file !== null) {
				entryFiles.set(entry, file);
			}
		});

		let items: MostViewedRenderItem[] = Array.from(
			entryFiles.entries(),
		).map(([entry, file]) => {
			const viewCount =
				plugin.viewCountCache!.getViewCountForEntryByMethod(
					entry,
					panelCountMethod,
				);
			return { file, displayName: getDisplayName(file), viewCount };
		});
		items = items.filter((item) => matchesSearch(item.displayName, item.file));
		items = items.slice(0, itemCount);
		viewRenderItems = items;
	}

	function updateTrendItems() {
		const entries = plugin.viewCountCache!.getEntries();

		const entryFiles: Map<ViewCountEntry, TFile> = new Map();
		entries.forEach((entry) => {
			const file = plugin.app.vault.getFileByPath(entry.path);
			if (file !== null) {
				entryFiles.set(entry, file);
			}
		});

		let items: TrendingRenderItem[] = Array.from(entryFiles.entries()).map(
			([entry, file]) => {
				const timesOpened =
					plugin.viewCountCache!.getNumTimesOpenedForEntry(
						entry,
						timePeriod!,
						panelCountMethod,
					);
				return {
					file,
					displayName: getDisplayName(file),
					timesOpened: timesOpened,
				};
			},
		);
		items.sort((a, b) => b.timesOpened - a.timesOpened);
		items = items.filter((item) => item.timesOpened > 0);
		items = items.filter((item) => matchesSearch(item.displayName, item.file));
		items = items.slice(0, itemCount);
		trendRenderItems = items;
	}

	function matchesSearch(displayName: string, file: TFile): boolean {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return true;
		}

		const nameText =
			file.extension === "md" ? `${file.basename} ${file.name}` : file.name;
		const inName =
			displayName.toLowerCase().includes(query) ||
			nameText.toLowerCase().includes(query);

		if (inName) {
			return true;
		}

		if (!searchInPath) {
			return false;
		}

		return file.path.toLowerCase().includes(query);
	}

	function formatRecentLabel(lastViewedMillis: number) {
		const oneDayMillis = 24 * 60 * 60 * 1000;
		const now = new Date();
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).getTime();
		const target = new Date(lastViewedMillis);
		const targetStart = new Date(
			target.getFullYear(),
			target.getMonth(),
			target.getDate(),
		).getTime();
		const daysDiff = Math.floor((todayStart - targetStart) / oneDayMillis);
		const timeText = target.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});

		if (daysDiff <= 0) {
			return `${t("recent.today")} ${timeText}`;
		}

		if (daysDiff === 1) {
			return `${t("recent.yesterday")} ${timeText}`;
		}

		if (daysDiff === 2) {
			return `${t("recent.dayBeforeYesterday")} ${timeText}`;
		}

		return `${daysDiff} ${t("recent.daysAgo")}`;
	}

	function updateRecentItems() {
		if (!plugin.viewCountCache) {
			recentRenderItems = [];
			return;
		}

		const entries = plugin.viewCountCache.getEntries();
		const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));

		const candidateFiles =
			preferViewedAtInRecent && plugin.settings.recentFallbackToModifiedTime
				? plugin.app.vault.getMarkdownFiles()
				: entries
						.map((entry) => plugin.app.vault.getFileByPath(entry.path))
						.filter((file): file is TFile => file !== null);

		const trackedFiles = candidateFiles.filter((file) =>
			shouldTrackFile(file, plugin.settings.excludedPaths),
		);

		const items: RecentViewedRenderItem[] = [];
		trackedFiles.forEach((file) => {
			const entry = entryByPath.get(file.path);
			const lastViewedMillis = getRecentTimestamp(file, entry);
			if (lastViewedMillis === 0) {
				return;
			}

			items.push({
				file,
				displayName: getDisplayName(file),
				lastViewedMillis,
				lastViewedLabel: formatRecentLabel(lastViewedMillis),
			});
		});

			recentRenderItems = items
			.sort((a, b) => b.lastViewedMillis - a.lastViewedMillis)
			.filter((item) => matchesSearch(item.displayName, item.file))
			.slice(0, itemCount);
	}

	function parseCommonDateTime(value: string): number | null {
		const dateOnlyDash = /^(\d{4})-(\d{2})-(\d{2})$/;
		const dateOnlySlash = /^(\d{4})\/(\d{2})\/(\d{2})$/;
		const dateTimeDash =
			/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;
		const dateTimeSlash =
			/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;

		const matchDateOnly = value.match(dateOnlyDash) ?? value.match(dateOnlySlash);
		if (matchDateOnly) {
			const [, year, month, day] = matchDateOnly;
			return new Date(
				Number(year),
				Number(month) - 1,
				Number(day),
				0,
				0,
				0,
			).getTime();
		}

		const matchDateTime =
			value.match(dateTimeDash) ?? value.match(dateTimeSlash);
		if (matchDateTime) {
			const [, year, month, day, hour, minute, second] = matchDateTime;
			return new Date(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
				Number(second ?? "0"),
			).getTime();
		}

		return null;
	}

	function getDateFromMetadataProperty(
		file: TFile,
		propertyName: string,
	): number | null {
		if (!propertyName) {
			return null;
		}

		const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
		const rawValue = frontmatter?.[propertyName];

		if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
			return rawValue > 1e12 ? rawValue : rawValue * 1000;
		}

		if (typeof rawValue === "string" && rawValue.trim().length > 0) {
			const parsedCommon = parseCommonDateTime(rawValue.trim());
			if (parsedCommon !== null) {
				return parsedCommon;
			}

			const fallbackParsed = Date.parse(rawValue);
			if (!Number.isNaN(fallbackParsed)) {
				return fallbackParsed;
			}
		}

		return null;
	}

	function getRecentTimestamp(file: TFile, entry?: ViewCountEntry): number {
		const openLogMillis = entry?.openLogs.last()?.timestampMillis ?? 0;

		if (!preferViewedAtInRecent) {
			return openLogMillis;
		}

		const viewedAtMillis = getDateFromMetadataProperty(
			file,
			plugin.settings.viewDatePropertyName?.trim() ?? "",
		);
		if (viewedAtMillis !== null) {
			return viewedAtMillis;
		}

		if (plugin.settings.recentFallbackToModifiedTime) {
			const modifiedPropMillis = getDateFromMetadataProperty(
				file,
				plugin.settings.recentModifiedTimePropertyName?.trim() ?? "",
			);
			if (modifiedPropMillis !== null) {
				return modifiedPropMillis;
			}

			return file.stat.mtime;
		}

		return openLogMillis;
	}

	function handleViewsClick() {
		currentView = TView.VIEWS;
	}

	function handleTrendsClick() {
		currentView = TView.TRENDS;
	}

	function handleRecentClick() {
		currentView = TView.RECENT;
	}

	function scheduleSaveSettings() {
		saveSettingsDebounced();
	}

	function handleSearchClick() {
		isSearchExpanded = !isSearchExpanded;
		if (!isSearchExpanded) {
			searchQuery = "";
			return;
		}

		window.setTimeout(() => {
			searchInputEl?.focus();
		}, 0);
	}

	function handlePanelCountMethodClick(e: CustomEvent) {
		const { nativeEvent } = e.detail;

		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle(t("method.uniqueDays"));
			item.setChecked(panelCountMethod === "unique-days-opened");
			item.onClick(() => (panelCountMethod = "unique-days-opened"));
		});
		menu.addItem((item) => {
			item.setTitle(t("method.totalTimes"));
			item.setChecked(panelCountMethod === "total-times-opened");
			item.onClick(() => (panelCountMethod = "total-times-opened"));
		});
		menu.showAtMouseEvent(nativeEvent);
	}

	function handleRecentViewedAtFallbackClick() {
		preferViewedAtInRecent = !preferViewedAtInRecent;
	}

	$: if (plugin && !plugin.settings.recentFallbackToModifiedTime) {
		preferViewedAtInRecent = false;
	}

	function handleItemCountClick(e: CustomEvent) {
		const { nativeEvent } = e.detail;

		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle("10");
			item.setChecked(itemCount === 10);
			item.onClick(() => (itemCount = 10));
		});
		menu.addItem((item) => {
			item.setTitle("15");
			item.setChecked(itemCount === 15);
			item.onClick(() => (itemCount = 15));
		});
		menu.addItem((item) => {
			item.setTitle("20");
			item.setChecked(itemCount === 20);
			item.onClick(() => (itemCount = 20));
		});
		menu.addItem((item) => {
			item.setTitle("25");
			item.setChecked(itemCount === 25);
			item.onClick(() => (itemCount = 25));
		});
		menu.addItem((item) => {
			item.setTitle("50");
			item.setChecked(itemCount === 50);
			item.onClick(() => (itemCount = 50));
		});
		menu.addItem((item) => {
			item.setTitle("100");
			item.setChecked(itemCount === 100);
			item.onClick(() => (itemCount = 100));
		});
		menu.showAtMouseEvent(nativeEvent);
	}

	function handleTimePeriodClick(e: CustomEvent) {
		const { nativeEvent } = e.detail;

		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle(t("period.3days"));
			item.setChecked(timePeriod === TimePeriod.DAYS_3);
			item.onClick(() => (timePeriod = TimePeriod.DAYS_3));
		});
		menu.addItem((item) => {
			item.setTitle(t("period.7days"));
			item.setChecked(timePeriod === TimePeriod.DAYS_7);
			item.onClick(() => (timePeriod = TimePeriod.DAYS_7));
		});
		menu.addItem((item) => {
			item.setTitle(t("period.14days"));
			item.setChecked(timePeriod === TimePeriod.DAYS_14);
			item.onClick(() => (timePeriod = TimePeriod.DAYS_14));
		});
		menu.addItem((item) => {
			item.setTitle(t("period.30days"));
			item.setChecked(timePeriod === TimePeriod.DAYS_30);
			item.onClick(() => (timePeriod = TimePeriod.DAYS_30));
		});
		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle(t("period.today"));
			item.setChecked(timePeriod === TimePeriod.TODAY);
			item.onClick(() => (timePeriod = TimePeriod.TODAY));
		});
		menu.addItem((item) => {
			item.setTitle(t("period.week"));
			item.setChecked(timePeriod === TimePeriod.WEEK);
			item.onClick(() => (timePeriod = TimePeriod.WEEK));
		});
		menu.addItem((item) => {
			item.setTitle(t("period.weekIso"));
			item.setChecked(timePeriod === TimePeriod.WEEK_ISO);
			item.onClick(() => (timePeriod = TimePeriod.WEEK_ISO));
		});
		menu.addItem((item) => {
			item.setTitle(t("period.month"));
			item.setChecked(timePeriod === TimePeriod.MONTH);
			item.onClick(() => (timePeriod = TimePeriod.MONTH));
		});
		menu.showAtMouseEvent(nativeEvent);
	}

	async function handleItemClick(e: CustomEvent) {
		const { file } = e.detail;
		await plugin.openFileFromPanel(file);
	}

	$: if (plugin && timePeriod && itemCount) {
		searchQuery;
		searchInPath;
		panelCountMethod;
		preferViewedAtInRecent;
		updateViewItems();
		updateTrendItems();
		updateRecentItems();
	}

	$: timePeriod, itemCount, currentView, scheduleSaveSettings();

	onMount(() => {
		return () => {
			saveSettingsDebounced.cancel();
		};
	});
</script>

<div class="nav-header">
	<div class="nav-buttons-container">
		<div class="nav-buttons-group nav-buttons-group--tabs">
			<IconButton
				ariaLabel={t("tab.recent")}
				iconId="clock-3"
				isActive={currentView == TView.RECENT}
				on:click={handleRecentClick}
			/>
			<IconButton
				ariaLabel={t("tab.views")}
				iconId="eye"
				isActive={currentView == TView.VIEWS}
				on:click={handleViewsClick}
			/>
			<IconButton
				ariaLabel={t("tab.trends")}
				iconId="trending-up"
				isActive={currentView == TView.TRENDS}
				on:click={handleTrendsClick}
			/>
		</div>
		<div class="nav-buttons-group nav-buttons-group--actions">
			<IconButton
				ariaLabel={t("action.search")}
				iconId="search"
				isActive={isSearchExpanded}
				on:click={handleSearchClick}
			/>
			{#if currentView === TView.TRENDS}
				<IconButton
					ariaLabel={t("action.timePeriod")}
					iconId="history"
					on:click={handleTimePeriodClick}
				/>
			{/if}
			{#if currentView !== TView.RECENT}
				<IconButton
					ariaLabel={t("action.panelCountMethod")}
					iconId="sigma"
					on:click={handlePanelCountMethodClick}
				/>
			{/if}
			{#if currentView === TView.RECENT && plugin?.settings.recentFallbackToModifiedTime}
				<IconButton
					ariaLabel={t("action.recentViewedAtFallback")}
					iconId="clock"
					isActive={preferViewedAtInRecent}
					on:click={handleRecentViewedAtFallbackClick}
				/>
			{/if}
			<IconButton
				ariaLabel={t("action.itemCount")}
				iconId="hash"
				on:click={handleItemCountClick}
			/>
		</div>
	</div>
	{#if isSearchExpanded}
		<div class="view-count-search-row">
			<input
				class="view-count-search-input"
				type="text"
				placeholder={t("placeholder.search")}
				bind:value={searchQuery}
				bind:this={searchInputEl}
			/>
			<IconButton
				ariaLabel={t("action.searchPathToggle")}
				iconId="folder-search-2"
				isActive={searchInPath}
				on:click={() => (searchInPath = !searchInPath)}
			/>
		</div>
	{/if}
</div>
<div class="view-content view-count-view">
	{#if currentView === TView.VIEWS}
		<ViewsView
			renderItems={viewRenderItems}
			emptyText={t("empty")}
			on:itemClick={handleItemClick}
		/>
	{/if}
	{#if currentView === TView.TRENDS}
		<TrendsView
			renderItems={trendRenderItems}
			emptyText={t("empty")}
			on:itemClick={handleItemClick}
		/>
	{/if}
	{#if currentView === TView.RECENT}
		<RecentView
			renderItems={recentRenderItems}
			emptyText={t("empty")}
			on:itemClick={handleItemClick}
		/>
	{/if}
</div>
