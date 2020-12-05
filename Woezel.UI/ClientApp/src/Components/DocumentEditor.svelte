<script type="ts">
    import Editor from "./Editor.svelte";
    import { post } from "./../Services/http";
    import { documentStore } from "./../Services/file";

    let file;
    let text = "";

    let onSave = async (event) => {
        let code = event.detail;
        var result = await post("/Document", { code });
        console.log(result);
    };

    documentStore.subscribe((value: any) => {
        file = value.selectedFile;
        text = value.text;
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
    <div class="header">{file ? file.namespace : 'unknown file'}</div>

    <div class="editor">
        <Editor {text} on:save={onSave} />
    </div>

    <div class="footer">footer</div>
</div>
