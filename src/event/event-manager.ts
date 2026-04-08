import Logger from "js-logger";
import { PluginEvent, EventCallback } from "./types";

export default class EventManager {
	private static instance: EventManager;
	private eventListeners: Record<PluginEvent, EventCallback[]>;

	private constructor() {
		this.eventListeners = {} as Record<PluginEvent, EventCallback[]>;
	}

	public static getInstance(): EventManager {
		if (!EventManager.instance) {
			EventManager.instance = new EventManager();
		}
		return EventManager.instance;
	}

	public static destroy(): void {
		if (EventManager.instance) {
			EventManager.instance.eventListeners = {} as Record<PluginEvent, EventCallback[]>;
			delete (EventManager as any).instance;
		}
	}

	public on(eventName: PluginEvent, callback: EventCallback): void {
		if (!this.eventListeners[eventName]) {
			this.eventListeners[eventName] = [];
		}
		this.eventListeners[eventName].push(callback);
	}

	public off(
		eventName: PluginEvent,
		callbackToRemove: EventCallback
	): void {
		if (!this.eventListeners[eventName]) {
			return;
		}
		this.eventListeners[eventName] = this.eventListeners[eventName].filter(
			(callback) => callback !== callbackToRemove
		);
	}

	public emit(eventName: PluginEvent, ...data: any[]): void {
		Logger.trace({ fileName: "event-manager.ts", functionName: "emit", message: "called" });
		Logger.trace({ fileName: "event-manager.ts", functionName: "emit", message: "emitting event" }, { eventName });
		if (!this.eventListeners[eventName]) {
			return;
		}
		this.eventListeners[eventName].forEach((callback) => {
			callback(...data);
		});
	}
}
