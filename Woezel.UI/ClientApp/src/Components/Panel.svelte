<script>
    export let style;
</script>

<style>
    .panel {
        height: 100%;
        width: 100%;
        background: white;
        padding: 1rem;
        overflow: auto;
    }
</style>

<div class="panel" {style}>
    <slot />
</div>
