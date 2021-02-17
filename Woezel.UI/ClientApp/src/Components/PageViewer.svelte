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
    <Page>
        <iframe class="html-frame" src={url} title="Page" />
    </Page>
    <div class="bottom" />
</div>

<!-- <Page {content} />
    <Page name="Carlos" />
    <Page name="Vincent" />
     -->
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
    .html-frame {
        border: none;
        width: 100%;
        height: 100%;
    }
</style>
