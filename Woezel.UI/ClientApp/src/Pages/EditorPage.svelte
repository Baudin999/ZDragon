<script>
    import FileExplorer from "../Components/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import PageViewer from "../Components/PageViewer.svelte";
    import Menu from "../Components/Menu.svelte";
</script>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: row;

        .menu {
            width: 60px;
            background: var(--color-secundary);
        }

        .file-explorer {
            width: 300px;
            height: 100%;
            border-right: 1px solid lightgray;
        }
        .document-editor {
            width: 775px;
        }
        .page-viewer {
            flex: 1;
            font-family: sans-serif;
            background: gray;
            padding: 0;
            margin: 0;
            height: 100%;
            width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding-top: 1cm;
        }
    }
</style>

<div class="container">
    <div class="menu">
        <Menu />
    </div>
    <div class="file-explorer">
        <FileExplorer />
    </div>
    <div class="document-editor">
        <DocumentEditor />
    </div>
    <div class="page-viewer">
        <PageViewer />
    </div>
</div>
