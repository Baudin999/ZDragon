<script>
    import { writable } from "svelte/store";

    import { state, toggleRefactoringDialog } from "../Services/app.js";
    import eventbus from "../Services/eventbus.js";

    let file = writable({});
    let content = [];
    let namespace = "";
    let title = "";

    const submitForm = () => {
        console.log($file);
    };

    state.subscribe((s) => {
        if (!s || !s.refactoring || !s.module || !s.module.namespace) return;

        // do the magic
        content = s.refactoring.content || [];
        namespace = s.refactoring.namespace;
        title = s.refactoring.title;
        let [appName, _type, ...rest] = s.module.namespace.split(".");
        let type = _type.slice(0, _type.length - 1);
        file.update((f) => {
            return {
                ...f,
                name: s.refactoring.title,
                appName,
                type,
            };
        });
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

    <div class="details">
        <form class="form">
            <div class="form--field">
                <label for="cf_001">File Name</label>
                <input id="cf_001" bind:value={$file.name} />
            </div>

            <div class="form--field">
                <label for="cf_002">Type</label>
                <select id="cf_002" bind:value={$file.type}>
                    <option />
                    <option>Component</option>
                    <option>Feature</option>
                    <option>Database</option>
                    <option>Endpoint</option>
                    <option>Model</option>
                    <option>Story</option>
                    <option>Documentation</option>
                    <option>Empty</option>
                </select>
            </div>

            <div class="form--field">
                <label for="cf_003">Application Name</label>
                <input id="cf_003" bind:value={$file.appName} />
                <!-- on:change={changeValue("appName")} /> -->
            </div>

            <button on:click={submitForm} type="button">Submit</button>
        </form>
    </div>
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
