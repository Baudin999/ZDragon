<script type="ts">
    import { Tabs, TabList, TabPanel, Tab } from "../Components/components.js";
    import FileExplorer from "../Components/FileExplorer/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import Panel from "../Components/Panel.svelte";
    import PageViewer from "../Components/PageViewer.svelte";
    import ASTViewer from "../Components/ASTViewer.svelte";
    import { documentStore } from "../Services/file.js";
    import { astStore } from "../Services/ast.js";

    let timeout;
    let file;
    documentStore.subscribe((s: any) => {
        file = s?.selectedFile;
    });

    astStore.subscribe((store: any) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            file = store.file;
        }, 1500);
    });
</script>

<style type="less">
    .container {
        height: 100%;
        width: 100%;
        display: grid;
        grid-template-columns: 300px 750px auto;
        grid-gap: 1px;

        .file-explorer--container {
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
            position: relative;
            grid-column: 3;
            font-family: sans-serif;
            padding: 0;
            margin: 0;
            height: 100%;
            max-height: 100%;
            overflow-x: hidden;
            overflow-y: hidden;
            background-color: lightgray;
        }
    }
    img {
        margin-top: 4rem;
        max-width: 100%;
        max-height: 100%;
    }
    i {
        margin-top: 4rem;
        display: block;
        &:hover {
            color: pink;
            cursor: pointer;
        }
    }
</style>

<div class="container">
    <div class="file-explorer--container">
        <FileExplorer />
    </div>
    <div class="document-editor">
        <div>
            <DocumentEditor />
        </div>
    </div>
    <div class="page-viewer">
        <Tabs>
            <TabList>
                <Tab>Image</Tab>
                <Tab>AST</Tab>
                <Tab>Document</Tab>
            </TabList>

            <TabPanel>
                <Panel>
                    {#if file}
                        <i
                            class="fa fa-refresh"
                            on:click={() => (file = file)} />
                        <img
                            alt="svg"
                            src={`/documents/${file ? file.namespace : 'unknown'}.svg?timestamp=${new Date().getMilliseconds()}`} />
                    {/if}
                </Panel>
            </TabPanel>

            <TabPanel>
                <Panel
                    style="margin-top: 3rem; height: calc(100% - 3rem); overflow: hidden; padding: 0;">
                    <ASTViewer />
                </Panel>
            </TabPanel>

            <TabPanel>
                <Panel
                    style="background:lightgray; height: calc(100% - 3rem); margin-top: 3rem; padding: 0; padding-top: 2rem;">
                    <PageViewer />
                </Panel>
            </TabPanel>
        </Tabs>
    </div>
</div>
