<script>
    import { onMount } from "svelte";

    import Panel from "../Components/Panel.svelte";
    import { stateStore } from "../Services/state";

    let graphContainer;
    let s;

    stateStore.subscribe((s) => {
        let volumes = [];
        if (s.files && s.files.applications) {
            volumes = s.files.applications;
        }
        console.log(volumes);
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
