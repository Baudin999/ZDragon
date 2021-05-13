<script>
    import { state } from "../Services/app";
    import Application from "./FileExplorer_Application.svelte";

    var applications = [];
    var selectedApplication = null;
    state.subscribe((s) => {
        applications = s.applications || [];
        selectedApplication = s.application || {};
    });
</script>

<div class="file-explorer">
    {#each applications as application (new Date())}
        <Application
            {application}
            selected={application.namespace ===
                selectedApplication.namespace} />
    {/each}
</div>

<style>
    .file-explorer {
        height: 100%;
        border-right: 1px solid var(--color-1--border);
        background-color: var(--color-1--bg);
        overflow-y: auto;
        overflow-x: hidden;
        padding-top: 2rem;
    }
</style>
