<script type="ts">
    import {
        Tabs,
        TabList,
        TabPanel,
        Tab,
        Modal,
    } from "../Components/components.js";
    import PageViewer from "../Components/PageViewer.svelte";
    import FileExplorer from "../Components/FileExplorer/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import Panel from "../Components/Panel.svelte";
    import {
        moduleStore,
        selectModuleByNamespace,
    } from "../Services/module.js";
    import {
        stateStore,
        toggleAddFileDialog,
        toggleAddApplicationDialog,
        toggleRefactorDialog,
    } from "../Services/state.js";
    import CreateFile from "../Forms/CreateFile.svelte";
    import CreateApplication from "../Forms/CreateApplication.svelte";
    // import RefactorDialog from "../Forms/RefactorDialog.svelte";

    export let namespace = "";
    var oldNamespace = "";

    let iframe;
    let timeout;
    let module;
    let svgUrl;
    let componentUrl;
    let htmlUrl;

    let context = [];

    const generateUrls = (ns) => {
        if (!ns) return;
        svgUrl = `/documents/${ns}/data.svg?timestamp=${new Date().getMilliseconds()}`;
        componentUrl = `/documents/${ns}/components.svg?timestamp=${new Date().getMilliseconds()}`;
        htmlUrl = `/documents/${ns}/page.html?timestamp=${new Date().getMilliseconds()}`;
    };

    moduleStore.subscribe((s: any) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (!s || !s.selectedModule || !s.modules) {
                svgUrl = undefined;
                componentUrl = undefined;
                htmlUrl = undefined;
                return;
            }
            module = s.modules[s.selectedModule];
            generateUrls(module.namespace);
            console.log("urls generated");
        }, 400);
    });

    let showAddApplicationDialog = false;
    let showAddFileDialog = false;
    let showRefactorDialog = false;

    stateStore.subscribe((s: any) => {
        showAddFileDialog = !!s.showAddFileDialog;
        showAddApplicationDialog = !!s.showAddApplicationDialog;
        showRefactorDialog = !!s.showRefactorDialog;
    });

    let print = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    };

    $: {
        if (moduleStore && oldNamespace !== namespace) {
            selectModuleByNamespace(namespace);
            oldNamespace = namespace;
        }
    }
</script>

<div class="container">
    <div class="file-explorer--container">
        <FileExplorer />
    </div>
    <div class="document-editor">
        <div>
            <DocumentEditor {context} />
        </div>
    </div>
    <div class="page-viewer">
        <Tabs>
            <TabList>
                <Tab>Document</Tab>
                <Tab>Architecture</Tab>
                <Tab>Data Model</Tab>
            </TabList>

            <TabPanel>
                {#if htmlUrl}
                    <Panel
                        style="background:var(--color-1); overflow:hidden!important; height: calc(100% - 3rem); margin-top: 2.5rem; padding: 2rem 0 2rem 0;">
                        <PageViewer>
                            <!-- <PageViewer url={htmlUrl} /> -->
                            <iframe
                                bind:this={iframe}
                                class="html-iframe"
                                src={htmlUrl}
                                title="Page" />
                        </PageViewer>
                    </Panel>
                {/if}
            </TabPanel>

            <TabPanel>
                <Panel style="height: calc(100% - 3rem);">
                    {#if svgUrl}
                        <img alt="svg" src={componentUrl} />
                    {/if}
                </Panel>
            </TabPanel>

            <TabPanel>
                <Panel style="height: calc(100% - 3rem);">
                    {#if componentUrl}
                        <img alt="svg" src={svgUrl} />
                    {/if}
                </Panel>
            </TabPanel>
        </Tabs>

        <div class="print-button" on:click={print}>
            <i class="fa fa-print" />
        </div>
    </div>

    <Modal
        title="Add File"
        show={showAddFileDialog}
        close={toggleAddFileDialog}>
        <CreateFile />
    </Modal>
    <Modal
        title="Add Application"
        show={showAddApplicationDialog}
        close={toggleAddApplicationDialog}>
        <CreateApplication />
    </Modal>
    <!-- <Modal
        title="Refactor"
        show={showRefactorDialog}
        close={toggleRefactorDialog}>
        <RefactorDialog />
    </Modal> -->
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
    .html-iframe {
        min-width: 21cm;
        max-width: 21cm;
        width: 21cm;

        border: none;
        height: 100%;

        background: white;

        margin-left: 2rem;
    }
    .print-button {
        position: fixed;
        z-index: 99999;
        right: 1rem;
        bottom: 0rem;
        height: 32px;
        width: 32px;
    }
</style>
