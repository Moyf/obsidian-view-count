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

export interface RecentViewedRenderItem {
	file: TFile;
	displayName: string;
	lastViewedMillis: number;
	lastViewedLabel: string;
}
