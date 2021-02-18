<script>
    import { onMount } from "svelte";
    import Page from "./Page.svelte";

    export let url;

    let container;
    function resize() {
        if (!container) return;
        var scaleX = container.clientWidth / 900;
        if (scaleX < 1) {
            container.setAttribute("style", `transform: scale(${scaleX})`);
        }
    }

    function watch() {
        var ro = new ResizeObserver(resize);
        ro.observe(document.body);
    }

    onMount(() => {
        watch();
        setTimeout(() => {
            resize();
        });
    });
</script>

<div class="page-wrapper" bind:this={container}>
    <iframe scrolling="no" class="html-frame" src={url} title="Page" />
    <div class="bottom" />
</div>

<style>
    .page-wrapper {
        height: 0;
        transform-origin: top middle;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        align-content: flex-start;

        padding-bottom: 2cm;
    }
    .bottom {
        display: block;
        height: 2cm;
    }
</style>
