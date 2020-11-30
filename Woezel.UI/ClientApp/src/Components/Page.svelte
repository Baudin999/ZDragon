<script>
    export let name = "default";
    export let content = "";
    let page;
</script>

<style>
    .page {
        min-height: 29cm;
        max-height: 29cm;
        height: 29cm;
        min-width: 21cm;
        max-width: 21cm;
        width: 21cm;
        background: white;
        border: 1px solid lightblue;
        padding: 2.1cm;

        margin-bottom: 1cm;
    }
</style>

<div class="page-container">
    <div class="page" bind:this={page}>
        This is the page:
        {name}
        <pre>{content}</pre>
    </div>
</div>
