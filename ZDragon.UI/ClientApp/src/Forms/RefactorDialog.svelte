<script>
    import { state, toggleRefactoringDialog } from "../Services/app.js";
    import eventbus from "../Services/eventbus.js";

    let content = [];
    let namespace = "";
    let title = "";

    state.subscribe((s) => {
        if (s.refactoring) {
            content = s.refactoring.content || [];
            namespace = s.refactoring.namespace;
            title = s.refactoring.title;
        }
    });
</script>

<div class="refactor-content">
    <div class="items">
        {#each content as c}
            <div
                class="item"
                on:click={() => {
                    // on click navigate to the correct item
                    // in the other namespace
                    toggleRefactoringDialog();
                    eventbus.broadcast("navigate", c);
                }}>
                {#if c.isImage}
                    <img alt="svg" src={c.url} />
                {:else}
                    <pre>
                    {c.literal}
                </pre>
                {/if}
                <p class="namespace">{c.namespace}</p>
            </div>
        {/each}
    </div>

    <div class="details">Content</div>
</div>

<style type="less">
    .refactor-content {
        color: var(--color-1--font);
        max-height: 500px;
        overflow: hidden;
        display: flex;
        flex-direction: row;

        .items {
            overflow-y: auto;
            max-height: 450px;
            height: 450px;
            overflow-wrap: break-word;
            width: 100%;
            flex: 1;

            .item {
                border-bottom: 1px solid var(--color-1--border);
                &:first-child {
                    border-top: 1px solid var(--color-1--border);
                }
                .namespace {
                    font-size: 0.5rem;
                }
            }

            pre {
                white-space: pre-wrap; /* css-3 */
                white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
                white-space: -pre-wrap; /* Opera 4-6 */
                white-space: -o-pre-wrap; /* Opera 7 */
                word-wrap: break-word; /* Internet Explorer 5.5+ */
            }
        }

        .details {
            flex: 1;
            padding: 0 1rem 0 1rem;
        }
    }
</style>
