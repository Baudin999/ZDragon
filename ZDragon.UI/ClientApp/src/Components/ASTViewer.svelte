<script type="ts">
    import { onMount } from "svelte";
    import { moduleStore } from "../Services/module";
    import Editor from "./Editor.svelte";

    let input;
    let key;
    let text;
    let lexicon;

    moduleStore.subscribe((s: any) => {
        if (s && s.selectedModule && s.selectedModule.lexicon) {
            lexicon = s.selectedModule.lexicon;
            text = s.selectedModule.text;

            if (input) searchNode();
        } else {
            lexicon = {};
            text = "";
        }
    });

    const searchNode = (e?) => {
        var _key = key?.toLowerCase() || "";
        if (e && e.target && e.target.value !== key) {
            _key = e.target.value.toLowerCase();
        }

        if (!lexicon) return;
        if (!_key) {
            text = JSON.stringify(lexicon, null, 4);
        } else {
            var items = lexicon.filter(
                (i: any) => (i.id || "").toLowerCase().indexOf(_key) > -1
            );
            text = JSON.stringify(items, null, 4);
        }
    };

    onMount(() => {
        searchNode();
    });
</script>

{#if text}
    <div class="json-viewer">
        <div class="json-viewer--search">
            <span>Search:</span>
            <input
                bind:this={input}
                on:input={searchNode}
                on:change={searchNode}
                bind:value={key} />
        </div>
        <div class="json-viewer--editor">
            <Editor language="json" {text} />
        </div>
    </div>
{/if}

<style type="less">
    .json-viewer {
        height: 100%;
        width: 100%;
        display: grid;
        grid-template-rows: auto 1fr;

        .json-viewer--search {
            grid-row: 1;
            padding: 1rem;
            display: flex;
            vertical-align: middle;
            span {
                flex: 0;
                display: inline-block;
                margin-top: 0.5rem;
                margin-right: 1rem;
            }
            input {
                flex: 1;
            }
        }
        .json-viewer--editor {
            grid-row: 2;
        }
    }
</style>
