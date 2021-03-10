<script>
    import { onMount } from "svelte";
    import Page from "./Page.svelte";

    let container;
    function resize() {
        if (!container) return;
        var scaleX = container.clientWidth / 900;
        var height = container.parentElement.clientHeight;
        if (scaleX < 1) {
            container.setAttribute("style", `transform: scale(${scaleX})`);
            // let rest = height - height / scaleX;
            height = height / scaleX;
        }
        if (container.firstElementChild) {
            var value = "calc(" + height + "px - 5rem)";
            container.firstElementChild.style.height = value;
            container.firstElementChild.style.minHeight = value;
            container.firstElementChild.style.maxHeight = value;
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
    <slot />
    <!-- <div class="bottom" /> -->
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

        padding-bottom: 1cm;
    }
    .bottom {
        display: block;
        height: 1cm;
    }
</style>
