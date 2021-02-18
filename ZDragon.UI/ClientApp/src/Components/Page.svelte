<script>
    let page;
</script>

<div class="page-container">
    <div class="page" bind:this={page}>
        <slot />
    </div>
</div>

<style>
    .page {
        min-height: 29cm;
        min-width: 21cm;
        max-width: 21cm;
        width: 21cm;
        background: white;
        border: 1px solid lightblue;
        padding: 2.1cm;

        margin-bottom: 1cm;
    }
</style>
