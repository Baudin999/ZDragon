<script>
	import { getContext } from "svelte";
	import { TABS } from "./Tabs.svelte";

	const tab = {};
	const { registerTab, selectTab, selectedTab } = getContext(TABS);

	registerTab(tab);
</script>

<button class:selected={$selectedTab === tab} on:click={() => selectTab(tab)}>
	<slot />
</button>

<style type="less">
	button {
		background: none;
		border: none;
		border-bottom: 2px solid white;
		border-radius: 0;
		margin: 0;
		color: #ccc;

		&:hover,
		&:active,
		&:focus {
			outline: none;
		}
	}

	.selected {
		border-bottom: 2px solid var(--color-3);
		color: var(--color-3);
		outline: none;
	}
</style>
