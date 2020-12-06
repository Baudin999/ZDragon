<script>
    import { get } from "../../Services/http";
    import Directory from "./Directory.svelte";

    let documents;

    const getDocuments = async () => {
        documents = await get("/documents");
    };
    getDocuments();
</script>

<div class="file-explorer">
    {#if documents}
        <Directory directory={documents} open={true} showSelf={false} />
    {/if}
</div>
