<script>
    import Domain from "./Domain.svelte";
    import FileToolbar from "./FileToolbar.svelte";
    import { stateStore } from "./../../Services/state";
    import Application from "./Application.svelte";

    // getFiles();

    var applications = [];
    var selectedApplication = null;
    stateStore.subscribe(({ files = {} }) => {
        applications = [];
        setTimeout(() => {
            applications = files.applications || [];
        });
    });
</script>

<div class="file-explorer">
    {#each applications as application}
        <Application {application} bind:selectedApplication />
    {/each}
</div>

<style>
    .file-explorer {
        height: 100%;
        border-right: 1px solid var(--color-1--border);
        background-color: var(--color-1--bg);
        overflow: hidden;
        padding-top: 2rem;
    }
</style>
