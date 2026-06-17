<script lang="ts">
	import type { TFile } from "obsidian";
	import { createEventDispatcher } from "svelte";
	import type { RecentViewedRenderItem, TimeGroup } from "../types";
	import { highlightMatchHtml } from "../highlight";

	export let renderItems: RecentViewedRenderItem[];
	export let emptyText: string;
	export let searchQuery = "";
	export let getTimeGroupLabel: (group: TimeGroup) => string;
	const dispatch = createEventDispatcher();

	function handleItemClick(file: TFile) {
		dispatch("itemClick", { file });
	}

	function shouldShowGroupHeader(
		items: RecentViewedRenderItem[],
		index: number,
	): boolean {
		if (index === 0) return true;
		return items[index].timeGroup !== items[index - 1].timeGroup;
	}
</script>

{#if renderItems.length == 0}
	<div class="pane-empty">{emptyText}</div>
{:else}
	{#each renderItems as { file, displayName, lastViewedMillis, lastViewedLabel, timeGroup }, i}
		{#if shouldShowGroupHeader(renderItems, i)}
			<div class="tree-item view-count-group-header">
				<div class="tree-item-self">
					<div class="tree-item-inner">
						<div class="view-count-group-label">{getTimeGroupLabel(timeGroup)}</div>
					</div>
				</div>
			</div>
		{/if}
		<div class="tree-item">
			<div
				role="button"
				tabindex="0"
				class="tree-item-self is-clickable"
				on:click={() => handleItemClick(file)}
				on:keydown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						handleItemClick(file);
					}
				}}
			>
				<div class="tree-item-inner">
					<div class="tree-item-inner-text">
						{#if highlightMatchHtml(displayName, searchQuery)}
							{@html highlightMatchHtml(displayName, searchQuery)}
						{:else}
							{displayName}
						{/if}
					</div>
				</div>
				<div class="tree-item-flair-outer">
					<div class="tree-item-flair" title={new Date(lastViewedMillis).toLocaleString()}>
						{lastViewedLabel}
					</div>
				</div>
			</div>
		</div>
	{/each}
{/if}
