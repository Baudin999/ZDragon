<script>
    import { onMount } from "svelte";
    import Page from "./Page.svelte";

    export let content;

    let container;
    function resize() {
        var scaleX = container.clientWidth / 900;

        if (scaleX < 1) {
            container.setAttribute("style", `transform: scale(${scaleX})`);
        }
    }

    function watch() {
        var ro = new ResizeObserver(resize);
        ro.observe(container);
    }

    onMount(() => {
        resize();
        watch();
    });
</script>

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

<div class="page-wrapper" bind:this={container}>
    <Page {content} />
    <Page name="Carlos" />
    <Page name="Vincent" />
    <div class="bottom" />
</div>
