<script>
    import { state } from "../Services/app";
    import eventbus from "../Services/eventbus";
    import { get } from "../Services/http";

    export let url = null;
    let oldUrl;

    let namespace;
    let imgContainer;
    let content;
    let parsed = false;

    let svgDocument;

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

    $: {
        if (url && url != oldUrl) {
            oldUrl = url;
            //
            setTimeout(async () => {
                var r = await get(url);
                content.innerHTML = r;
                setTimeout(() => {
                    var text = [...content.getElementsByTagName("text")];
                    text.forEach((item) => {
                        item.addEventListener("click", async (event) => {
                            var fragment = await get(
                                `/document/find/${namespace}/${event.target.textContent}`
                            );
                            eventbus.broadcast("navigate", fragment);
                        });
                    });
                });
            });
        }
    }

    state.subscribe((s) => {
        namespace = (s.module || {}).namespace;
    });
</script>

<div bind:this={imgContainer}>
    <div
        on:mousedown={startDrag}
        on:mousemove={drag}
        on:mouseup={stopDrag}
        on:mouseleave={stopDrag}
        on:mousewheel={zoom}
        class="content"
        bind:this={content}
        style={`transform: scale(${scale}) translate(${imgH}px, ${imgV}px);z-index:-1;`} />

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
    <div class="overlay" />
</div>

<style type="less">
    // .overlay {
    //     position: relative;
    //     z-index: 999;
    // }
    .content:hover {
        cursor: grab;
        cursor: -moz-grab;
        cursor: -webkit-grab;
    }
    .content:hover {
        cursor: grabbing;
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
    }
    // object {
    //     position: relative;
    //     z-index: 1;
    //     pointer-events: auto;
    // }
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
