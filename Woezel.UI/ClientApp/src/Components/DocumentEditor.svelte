<script>
    import Editor from "./Editor.svelte";
</script>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;

        .header,
        .footer {
            flex: 0;
            padding: 0.5rem;
            border-bottom: 1px solid lightgray;
            border-top: 1px solid lightgray;
        }
        .editor {
            flex: 1;
        }
    }
</style>

<div class="container">
    <div class="header">header</div>

    <div class="editor">
        <Editor />
    </div>

    <div class="footer">footer</div>
</div>
