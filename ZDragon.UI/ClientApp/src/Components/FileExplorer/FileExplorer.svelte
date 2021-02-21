<script>
    import { get } from "../../Services/http";
    import Domain from "./Domain.svelte";
    import FileToolbar from "./FileToolbar.svelte";
    import { getFiles, stateStore } from "./../../Services/state";

    getFiles();
</script>

<div class="file-explorer">
    <FileToolbar />

    {#if $stateStore.files}
        <Domain domain={$stateStore.files} open={true} showSelf={false} />
    {/if}
</div>

<style>
    .file-explorer {
        height: 100%;
        border-right: 1px solid lightgray;
    }
</style>
