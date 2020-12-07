<script>
    import { get } from "../../Services/http";
    import Directory from "./Directory.svelte";

    let documents;

    const getDocuments = async () => {
        documents = await get("/documents");
    };
    getDocuments();
</script>

<style>
    .file-explorer {
        height: 100%;
        border-right: 1px solid lightgray;
    }
</style>

<div class="file-explorer">
    {#if documents}
        <Directory directory={documents} open={true} showSelf={false} />
    {/if}
</div>
