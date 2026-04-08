export interface ViewCountPluginSettings {
	countMethod: CountMethod;
	syncToFrontmatter: boolean;
	skipNewNotes: boolean;
	propertyName: string;
	syncViewDateToFrontmatter: boolean;
	viewDatePropertyName: string;
	viewDateFormat: string;
	pluginVersion: string;
	logLevel: string;
	excludedPaths: string[];
	templaterDelay: number;
	currentView: TView;
	timePeriod: TimePeriod;
	itemCount: ItemCount;
}

export enum TView {
	VIEWS = "views",
	TRENDS = "trends",
}

export type CountMethod = "unique-days-opened" | "total-times-opened";

export type ItemCount = 10 | 15 | 20 | 25 | 50 | 100;

export enum TimePeriod {
	MONTH = "month",
	WEEK_ISO = "week-iso",
	WEEK = "week",
	TODAY = "today",
	DAYS_30 = "30-days",
	DAYS_14 = "14-days",
	DAYS_7 = "7-days",
	DAYS_3 = "3-days",
}
