<script>
    import { get } from "../../Services/http";
    import Directory from "./Directory.svelte";

    let documents;

    const getDocuments = async () => {
        var r = await get("/documents");
        console.log(r);
        documents = r;
    };
    getDocuments();
</script>

<div>
    {#if documents}
        <Directory directory={documents} />
    {/if}
</div>
