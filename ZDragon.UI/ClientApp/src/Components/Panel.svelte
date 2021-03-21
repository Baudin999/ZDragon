<script type="ts">
    export let style: string = "";
</script>

<div class="panel" {style}>
    <slot />
</div>

<style>
    .panel {
        height: 100%;
        width: 100%;
        padding: 1rem;
        overflow: auto;
        background: transparent;
    }
</style>
