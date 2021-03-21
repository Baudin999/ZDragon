<script type="ts">
    import Editor from "../Components/Editor.svelte";
    import { post } from "../Services/http";
    import {
        moduleStore,
        selectModuleByNamespace,
    } from "../Services/module.js";

    export let namespace = "";
    var oldNamespace = "";

    let output = "";
    let text = "";
    let generateJsonSchema = async (event) => {
        const changedText = event.detail;
        localStorage.setItem("source", changedText);
        var result = await post("/json", { code: changedText });
        output = result.schemaText;
    };

    $: {
        if (moduleStore && oldNamespace !== namespace) {
            selectModuleByNamespace(namespace);
            oldNamespace = namespace;
        }
    }

    try {
        text = localStorage.getItem("source");
    } catch (ex) {}
</script>

<div class="container">
    <div class="document-editor">
        <div>
            <Editor {text} on:save={generateJsonSchema} />
        </div>
    </div>

    <div>
        <Editor text={output} language="json" />
    </div>
</div>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: grid;
        grid-template-columns: 750px auto;
        grid-gap: 1px;

        .document-editor {
            grid-column: 1;
            height: 100%;
            max-height: 100%;
            div {
                width: 100%;
                height: 100%;
            }
        }
    }
</style>
