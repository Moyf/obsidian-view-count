<script lang="ts">
	import type { TFile } from "obsidian";
	import { createEventDispatcher } from "svelte";
	import type { RecentViewedRenderItem } from "../types";

	export let renderItems: RecentViewedRenderItem[];
	export let emptyText: string;
	const dispatch = createEventDispatcher();

	function handleItemClick(file: TFile) {
		dispatch("itemClick", { file });
	}
</script>

{#if renderItems.length == 0}
	<div class="pane-empty">{emptyText}</div>
{:else}
	{#each renderItems as { file, displayName, lastViewedMillis, lastViewedLabel }}
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
					<div class="tree-item-inner-text">{displayName}</div>
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
