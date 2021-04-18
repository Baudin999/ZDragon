<script>
    import { state } from "../Services/app.js";

    let content = [];
    let namespace = "";
    let title = "";

    state.subscribe((s) => {
        if (s.refactoring) {
            content = s.refactoring.content || [];
            namespace = s.refactoring.namespace;
            title = s.refactoring.title;

            console.log(content);
        }
    });
</script>

<div class="refactor-content">
    <h3>Refactoring: {namespace}</h3>

    <div class="items">
        {#each content as c}
            {#if c.isImage}
                <img alt="svg" src={c.url} />
            {:else}
                <pre>
                {c.literal}
            </pre>
            {/if}
        {/each}
    </div>
</div>

<style type="less">
    .refactor-content {
        color: var(--color-1--font);
        max-height: 500px;
        overflow: hidden;

        .items {
            overflow-y: auto;
            max-height: 450px;
            overflow-wrap: break-word;
            width: 100%;

            pre {
                white-space: pre-wrap; /* css-3 */
                white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
                white-space: -pre-wrap; /* Opera 4-6 */
                white-space: -o-pre-wrap; /* Opera 7 */
                word-wrap: break-word; /* Internet Explorer 5.5+ */
            }
        }
    }
</style>
