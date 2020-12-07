<script type="ts">
    import { writable } from "svelte/store";
    import Editor from "./Editor.svelte";
    import { documentStore } from "../Services/file";
    import { parseCode, astStore } from "../Services/ast";

    let file;
    let text = "";
    let type = "carlang";
    let markers = writable([]);

    let onSave = async (event) => {
        if (!file || !event) return;
        let code = event.detail;
        parseCode(file, code);
    };

    documentStore.subscribe((value: any) => {
        file = value.selectedFile;
        text = value.text;

        if (file && file.path && file.path.endsWith(".json")) {
            type = "json";
            text = JSON.stringify(JSON.parse(text), null, 4);
        } else {
            type = "carlang";
        }
    });

    let mapErrorToken = (e) => {
        return {
            startLineNumber: e.sourceSegment.lineStart + 1,
            endLineNumber: e.sourceSegment.lineEnd + 1,
            startColumn: e.sourceSegment.columnStart + 1,
            endColumn: e.sourceSegment.columnEnd + 1,
            message: e.message,
        };
    };

    astStore.subscribe((v: any) => {
        var errors = v?.errorSink?.errors || [];
        var mappedErrors = errors.map(mapErrorToken);
        console.log(mappedErrors);
        markers.set(mappedErrors);
    });
</script>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: grid;
        grid-template-rows: min-content auto min-content;

        .header,
        .footer {
            padding: 0.5rem;
            color: var(--color-secundary);
            background: var(--color-secundary--alt);
        }
        header {
            grid-row: 1;
        }
        footer {
            grid-row: 3;
        }
        .editor {
            grid-row: 2;
        }
    }
</style>

<div class="container">
    <div class="header">
        {file ? file.namespace || file.path : 'unknown file'}
    </div>

    <div class="editor">
        <Editor {text} {markers} language={type} on:save={onSave} />
    </div>

    <div class="footer">footer</div>
</div>
