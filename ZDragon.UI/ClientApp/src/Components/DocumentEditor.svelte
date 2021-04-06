<script type="ts">
    import { writable } from "svelte/store";
    import Editor from "./Editor.svelte";
    import { moduleStore, saveCode, selectModule } from "../Services/module";

    export let context = [];

    let module;
    let text = "";
    let type = "carlang";
    let markers = writable([]);

    // let onSave = async (event) => {
    //     if (!module || !event) return;
    //     let code = event.detail;
    //     saveCode(module, code);
    // };

    let mapErrorToken = (e) => {
        return {
            startLineNumber: e.sourceSegment.lineStart + 1,
            endLineNumber: e.sourceSegment.lineEnd + 1,
            startColumn: e.sourceSegment.columnStart + 1,
            endColumn: e.sourceSegment.columnEnd + 1,
            message: e.message,
        };
    };

    moduleStore.subscribe((value: any) => {
        if (!value || !value.modules || !value.selectedModule) return;

        module = value.modules[value.selectedModule];
        if (!module) {
            text = "";
            markers.set([]);
            return;
        }
        text = module.text;

        var errors = module.compilationResult?.errors || [];
        var mappedErrors = errors.map(mapErrorToken);
        markers.set(mappedErrors);

        if (module && module.path && module.path.endsWith(".json")) {
            type = "json";
            text = JSON.stringify(JSON.parse(text), null, 4);
        } else {
            type = "carlang";
        }
    });
</script>

<div class="container">
    <div class="header">
        {module ? module.namespace || module.path : "unknown file"}
    </div>

    <div class="editor">
        <Editor {context} {text} {markers} language={type} />
        <!--on:save={onSave} -->
    </div>
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
            // padding: 0.5rem;
            color: var(--color-1--font);
            background: var(--color-1);
            // border-right: 1px solid var(--color-1--border);
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
            // border-right: 1px solid var(--color-1--border);
        }

        .sep {
            box-shadow: black 0 6px 6px -6px inset;
        }
    }
</style>
