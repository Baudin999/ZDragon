<!-- <script>
    import { state } from "../Services/app";
    import eventbus from "../Services/eventbus";

    import { get } from "../Services/http";

    export let scale = 1;
    export let imgH = 0;
    export let imgV = 0;
    export let url = "";
    export let alt = "svg";

    let namespace;

    let imgContainer;

    $: {
        if (imgContainer) {
            setTimeout(() => {
                var svgDocument = imgContainer.firstElementChild.getSVGDocument();

                if (svgDocument != null) {
                    var items = Array.prototype.slice.call(
                        svgDocument.getElementsByTagName("text"),
                        0
                    );
                    items.forEach((item) => {
                        item.addEventListener("click", async (event) => {
                            var fragment = await get(
                                `/document/find/${namespace}/${event.target.textContent}`
                            );
                            eventbus.broadcast("navigate", fragment);
                        });
                    });
                }
            }, 500);
        }
    }

    state.subscribe((s) => {
        namespace = (s.module || {}).namespace;
    });
</script>

<div bind:this={imgContainer}>
    <embed
        {alt}
        src={url}
        type="image/svg+xml"
        style={`transform: scale(${scale}) translate(${imgH}px, ${imgV}px);`} />
</div>

<style type="less">
    // embed {
    //     svg {
    //         rect:hover {
    //             cursor: pointer;
    //             stroke-width: 1px;
    //             stroke-dasharray: 2, 2;
    //             stroke-linejoin: round;
    //         }
    //     }
    // }
</style> -->
