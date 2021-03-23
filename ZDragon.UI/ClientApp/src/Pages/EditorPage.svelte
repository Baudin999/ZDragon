<script type="ts">
    import {
        Tabs,
        TabList,
        TabPanel,
        Tab,
        Modal,
    } from "../Components/components.js";
    import PageViewer from "../Components/PageViewer.svelte";
    import ImageViewer from "../Components/ImageViewer.svelte";
    import FileExplorer from "../Components/FileExplorer/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import Panel from "../Components/Panel.svelte";
    import {
        moduleStore,
        selectModuleByNamespace,
    } from "../Services/module.js";
    import { onMount, onDestroy } from "svelte";

    export let namespace = "";
    var oldNamespace = "";

    let iframe;
    let timeout;
    let module;
    let svgUrl;
    let componentUrl;
    let planningSvgUrl;
    let htmlUrl;
    let scrollY = 0;

    let componentsScale = 1;

    let context = [];

    const generateUrls = (event) => {
        scrollY = iframe?.contentWindow.scrollY ?? 0;

        if (!namespace) return;
        svgUrl = `/documents/${namespace}/data.svg?timestamp=${new Date().getMilliseconds()}`;
        componentUrl = `/documents/${namespace}/components.svg?timestamp=${new Date().getMilliseconds()}`;
        planningSvgUrl = `/documents/${namespace}/roadmap.svg?timestamp=${new Date().getMilliseconds()}`;
        htmlUrl = `/documents/${namespace}/page.html?timestamp=${new Date().getMilliseconds()}`;
    };

    onMount(() => {
        window.addEventListener("module_changed", generateUrls, false);
        generateUrls({});
    });
    onDestroy(() => {
        window.removeEventListener("module_changed", generateUrls, false);
    });

    let print = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    };

    $: {
        if (moduleStore && oldNamespace !== namespace) {
            selectModuleByNamespace(namespace);
            generateUrls(namespace);
            oldNamespace = namespace;
        }
        if (iframe && !iframe.onload) {
            iframe.onload = function () {
                setTimeout(() => {
                    iframe?.contentWindow.scroll(0, scrollY);
                });
            };
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
                <Tab>Planning</Tab>
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
                <Panel style="height: calc(100% - 3rem); overflow:auto;">
                    {#if componentUrl}
                        <ImageViewer url={componentUrl} />
                    {/if}
                </Panel>
            </TabPanel>

            <TabPanel>
                <Panel style="height: calc(100% - 3rem); overflow:auto;">
                    {#if svgUrl}
                        <ImageViewer url={svgUrl} />
                    {/if}
                </Panel>
            </TabPanel>

            <TabPanel>
                <Panel style="height: calc(100% - 3rem); overflow:auto;">
                    {#if planningSvgUrl}
                        <ImageViewer url={planningSvgUrl} />
                    {/if}
                </Panel>
            </TabPanel>
        </Tabs>

        <div class="print-button" on:click={print}>
            <i class="fa fa-print" />
        </div>
    </div>
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

    .print-button,
    .popout,
    .scale--inc,
    .scale--dec {
        position: fixed;
        z-index: 99999;
        top: 4rem;
        height: 32px;
        width: 32px;
    }

    .print-button {
        right: 1rem;
    }
    .popout {
        right: 3rem;
        a {
            color: inherit;
            text-decoration: inherit;
        }
    }
    .scale--inc {
        right: 5rem;
    }
    .scale--dec {
        right: 7rem;
    }
</style>
