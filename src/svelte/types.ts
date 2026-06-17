import { TFile } from "obsidian";

export interface MostViewedRenderItem {
	file: TFile;
	displayName: string;
	viewCount: number;
}

export interface TrendingRenderItem {
	file: TFile;
	displayName: string;
	timesOpened: number;
}

export type TimeGroup = "today" | "yesterday" | "within-3-days" | "earlier";

export interface RecentViewedRenderItem {
	file: TFile;
	displayName: string;
	lastViewedMillis: number;
	lastViewedLabel: string;
	timeGroup: TimeGroup;
}
