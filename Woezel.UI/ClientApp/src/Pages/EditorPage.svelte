<script>
    import FileExplorer from "../Components/FileExplorer/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import PageViewer from "../Components/PageViewer.svelte";
</script>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: grid;
        grid-template-columns: 300px 750px auto;
        grid-gap: 1px;
        background: var(--color-secundary);

        .file-explorer {
            grid-column: 1;
            height: 100%;
            max-height: 100%;
            overflow: auto;
            background: white;
        }
        .document-editor {
            grid-column: 2;
            height: 100%;
            max-height: 100%;
            div {
                width: 100%;
                height: 100%;
            }
        }
        .page-viewer {
            grid-column: 3;
            font-family: sans-serif;
            background: gray;
            padding: 0;
            margin: 0;
            height: 100%;
            max-height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding-top: 1cm;
        }
    }
</style>

<div class="container">
    <div class="file-explorer">
        <FileExplorer />
    </div>
    <div class="document-editor">
        <div>
            <DocumentEditor />
        </div>
    </div>
    <div class="page-viewer">
        <PageViewer />
    </div>
</div>
