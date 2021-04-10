<script>
    import eventbus from "../Services/eventbus";
    import { get } from "../Services/http";

    export let show;

    const keypressed = (e) => {
        if (e.key == "Enter") {
            search(e.target.value);
        }
    };
    let queryResult = [];
    const search = async (query) => {
        console.log(query);
        try {
            var result = await get("/project/search/" + query);
            queryResult = result;
        } catch (ex) {
            queryResult = [];
        }
    };
    const navigate = (node) => {
        eventbus.broadcast("navigate", node);
    };

    $: {
        if (show) {
            queryResult = [];
            var element = document.getElementById("query");
            element.value = "";
            element.focus();
        }
    }
</script>

<div class="container">
    <div class="form">
        <div class="form--field">
            <label for="query">Query</label>
            <input id="query" on:keypress={keypressed} />
        </div>
    </div>
    <div class="result-list">
        {#each queryResult as node}
            <div class="result-list--item" on:click={navigate(node)}>
                <span class="item--id">{node.id}</span>
                <span class="item--namespace">{node.namespace}</span>
                <span class="item--fileName">node.fileName</span>
            </div>
        {/each}
    </div>
</div>

<style type="less">
    .container {
        border: none;

        .result-list {
            color: var(--color-1--font);
            height: 250px;
            overflow-y: auto;
            border: 1px solid var(--color-1--bg);

            &--item {
                border-bottom: 1px solid var(--color-3--bg);
                padding: 5px;

                .item--id {
                    display: block;
                }
                .item--fileName,
                .item--namespace {
                    display: inline-block;
                    font-size: 0.5rem;
                    margin-right: 1rem;
                }

                &:hover {
                    cursor: pointer;
                    background: var(--color-3);
                    color: var(--color-3--font);
                }
            }
        }
    }
</style>
