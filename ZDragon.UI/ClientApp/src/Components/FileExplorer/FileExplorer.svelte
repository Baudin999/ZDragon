<script>
    import Domain from "./Domain.svelte";
    import FileToolbar from "./FileToolbar.svelte";
    import { getFiles, stateStore } from "./../../Services/state";
    import Application from "./Application.svelte";

    getFiles();

    var applications = [];
    stateStore.subscribe(({ files = {} }) => {
        // var { applications = [], modules = [] } = files || {};

        // console.log(applications);
        applications = files.applications || [];
        // console.log(modules);
    });
</script>

<div class="file-explorer">
    <FileToolbar />

    {#each applications as application}
        <Application {application} />
    {/each}

    <!-- {#if $stateStore.files}
        <Domain domain={$stateStore.files} open={true} showSelf={false} />
    {/if} -->
</div>

<style>
    .file-explorer {
        height: 100%;
        border-right: 1px solid lightgray;
    }
</style>
