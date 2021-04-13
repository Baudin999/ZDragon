<script>
    import { writable } from "svelte/store";
    import { state } from "../Services/app";
    import Editor from "./Editor.svelte";

    export let context = [];

    let module;
    let text = "";
    let type = "carlang";
    let markers = writable([]);

    let mapErrorToken = (e) => {
        return {
            startLineNumber: e.sourceSegment.lineStart + 1,
            endLineNumber: e.sourceSegment.lineEnd + 1,
            startColumn: e.sourceSegment.columnStart + 1,
            endColumn: e.sourceSegment.columnEnd + 1,
            message: e.message,
        };
    };

    state.subscribe((s) => {
        if (s.module) {
            module = s.module;
            text = module.text;
            markers.set(module.compilationResult.errors.map(mapErrorToken));
        } else {
            module = null;
            text = "";
            markers.set([]);
        }
    });
</script>

<div class="container">
    {#if module}
        <div class="header">
            {module ? module.namespace || module.path : "unknown file"}
        </div>

        <div class="editor">
            <Editor {context} {text} {markers} language={type} />
        </div>
    {/if}
</div>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: grid;
        grid-template-rows: min-content auto min-content;
        grid-gap: 0;

        .header,
        .footer {
            color: var(--color-1--font);
            background: var(--color-1);
            height: 2rem;
            line-height: 2rem;
            padding-left: 1rem;
            font-size: 0.8rem;
        }
        .header {
            grid-row: 1;
            border-bottom: 1px solid var(--color-1--border);
        }
        .footer {
            grid-row: 3;
            border-top: 1px solid var(--color-1--border);
        }
        .editor {
            grid-row: 2;
        }

        .sep {
            box-shadow: black 0 6px 6px -6px inset;
        }
    }
</style>
