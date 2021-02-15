<script type="ts">
    import {
        Tabs,
        TabList,
        TabPanel,
        Tab,
        Modal,
    } from "../Components/components.js";
    import FileExplorer from "../Components/FileExplorer/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import Panel from "../Components/Panel.svelte";
    import PageViewer from "../Components/PageViewer.svelte";
    import ASTViewer from "../Components/ASTViewer.svelte";
    import { documentStore } from "../Services/file.js";
    import { astStore } from "../Services/ast.js";
    import CreateDomain from "../Forms/CreateDomain.svelte";

    let timeout;
    let file;
    documentStore.subscribe((s: any) => {
        file = s?.selectedFile;
    });

    let showCreateDomain = false;
    let svgUrl;
    let componentUrl;
    astStore.subscribe((store: any) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            file = store.file;

            let ns = file ? file.namespace : "unknown";
            ns = ns.replace(".", "_");
            console.log(ns);
            svgUrl = `/documents/data.svg?timestamp=${new Date().getMilliseconds()}`;
            componentUrl = `/documents/components.svg?timestamp=${new Date().getMilliseconds()}`;

            console.log(componentUrl);
        }, 1500);
    });
</script>

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
                    {#if svgUrl}
                        <img alt="svg" src={svgUrl} />
                    {/if}
                    <br />
                    <hr />
                    <br />
                    {#if componentUrl}
                        <img alt="svg" src={componentUrl} />
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

    <Modal title="Create Domain" show={showCreateDomain}>
        <CreateDomain />
    </Modal>
</div>

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
            background-color: white;
        }
    }
    img {
        max-width: 100%;
        max-height: 100%;
    }
    i {
        display: block;
        &:hover {
            color: pink;
            cursor: pointer;
        }
    }
</style>
