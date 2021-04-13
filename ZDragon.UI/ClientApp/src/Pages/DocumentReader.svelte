<script>
    import { onMount } from "svelte";

    import Panel from "../Components/Panel.svelte";
    import { state } from "../Services/app";

    let graphContainer;
    let s;

    state.subscribe((s) => {
        //
        //
    });

    onMount(() => {});
</script>

<Panel>
    <div bind:this={graphContainer} />
</Panel>

<style>
    .content {
        color: white;
    }
</style>
