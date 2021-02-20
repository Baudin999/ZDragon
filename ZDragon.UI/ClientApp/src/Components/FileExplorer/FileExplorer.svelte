<script>
    import { get } from "../../Services/http";
    import Domain from "./Domain.svelte";
    import FileToolbar from "./FileToolbar.svelte";

    let domains;

    const getDocuments = async () => {
        domains = await get("/domains");
    };
    getDocuments();
</script>

<div class="file-explorer">
    <FileToolbar />

    {#if domains}
        <Domain domain={domains} open={true} showSelf={false} />
    {/if}
</div>

<style>
    .file-explorer {
        height: 100%;
        border-right: 1px solid lightgray;
    }
</style>
