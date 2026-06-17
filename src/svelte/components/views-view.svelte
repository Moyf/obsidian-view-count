<script lang="ts">
	import type { TFile } from "obsidian";
	import type { MostViewedRenderItem } from "../types";
	import { createEventDispatcher } from "svelte";
	import { highlightMatchHtml } from "../highlight";

	export let renderItems: MostViewedRenderItem[];
	export let emptyText: string;
	export let searchQuery = "";
	const dispatch = createEventDispatcher();

	function handleItemClick(file: TFile) {
		dispatch("itemClick", { file });
	}
</script>

{#if renderItems.length == 0}
	<div class="pane-empty">{emptyText}</div>
{:else}
	{#each renderItems as { file, displayName, viewCount }}
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
					<div class="tree-item-flair">
						{viewCount}
					</div>
				</div>
			</div>
		</div>
	{/each}
{/if}
