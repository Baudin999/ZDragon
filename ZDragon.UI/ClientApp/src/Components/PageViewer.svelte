<script>
    import { onMount } from "svelte";
    import Page from "./Page.svelte";

    let pageWrapper;
    function resize() {
        if (!pageWrapper) return;
        var scaleX = pageWrapper.clientWidth / 900;
        var height = pageWrapper.parentElement.clientHeight;
        if (scaleX < 1.5) {
            height = height / scaleX;
            pageWrapper.setAttribute("style", `transform: scale(${scaleX});`);
        }
        if (pageWrapper.firstElementChild) {
            var value = "calc(" + height + "px - 5rem)";
            pageWrapper.firstElementChild.style.height = value;
            pageWrapper.firstElementChild.style.minHeight = value;
            pageWrapper.firstElementChild.style.maxHeight = value;
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

<div class="page-wrapper" bind:this={pageWrapper}>
    <slot />
    <!-- <div class="bottom" /> -->
</div>

<style>
    .page-wrapper {
        height: 0;
        transform-origin: top !important;
        /* transform-origin: top middle; */

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        align-content: flex-start;

        /* padding-bottom: 2cm; */
    }
    .bottom {
        display: block;
        /* height: 1cm; */
    }
</style>
