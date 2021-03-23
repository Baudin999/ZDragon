<script>
    import { onDestroy, onMount } from "svelte";

    export let url = null;

    let scale = 1;
    let draging = false;
    let img;

    let initialX = 0;
    let initialY = 0;
    let imgH = 0;
    let imgV = 0;

    function startDrag(e) {
        initialX = e.clientX - imgH;
        initialY = e.clientY - imgV;
        draging = true;
        e.preventDefault();
    }

    function drag(e) {
        if (!draging) return;
        imgH = e.clientX - initialX;
        imgV = e.clientY - initialY;
        e.preventDefault();
    }

    function stopDrag(e) {
        draging = false;
        e.preventDefault();
    }

    function zoom(e) {
        if (e.deltaY < 0) scale += 0.05;
        else scale -= 0.05;
        e.preventDefault();
    }

    onMount(() => {});

    onDestroy(() => {});
</script>

<div
    on:mousedown={startDrag}
    on:mousemove={drag}
    on:mouseup={stopDrag}
    on:mouseleave={stopDrag}
    on:mousewheel={zoom}>
    {#if url}
        <img
            alt="svg"
            src={url}
            style={`transform: scale(${scale}) translate(${imgH}px, ${imgV}px);`} />
    {/if}

    <div class="popout">
        <a href={url} target="_blank"
            ><i class="fa fa-external-link" bind:this={img} /></a>
    </div>
    <div class="scale--inc" on:click={() => (scale += 0.1)}>
        <i class="fa fa-plus" />
    </div>
    <div class="scale--dec" on:click={() => (scale -= 0.1)}>
        <i class="fa fa-minus" />
    </div>
</div>

<style type="less">
    img:hover {
        cursor: grab;
        cursor: -moz-grab;
        cursor: -webkit-grab;
    }
    img:active {
        cursor: grabbing;
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
    }
    .popout,
    .scale--inc,
    .scale--dec {
        position: fixed;
        z-index: 99999;
        top: 4rem;
        height: 32px;
        width: 32px;
    }
    .popout {
        right: 3rem;
        a {
            color: inherit;
            text-decoration: inherit;
        }
    }
    .scale--inc {
        right: 5rem;
    }
    .scale--dec {
        right: 7rem;
    }
</style>
