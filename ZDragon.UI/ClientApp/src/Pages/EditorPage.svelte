<script>
    import { Tabs, TabList, TabPanel, Tab } from "../Components/components.js";
    import PageViewer from "../Components/PageViewer.svelte";
    import ImageViewer from "../Components/ImageViewer.svelte";
    import FileExplorer from "../Components/FileExplorer.svelte";
    import DocumentEditor from "../Components/DocumentEditor.svelte";
    import Panel from "../Components/Panel.svelte";
    import { log, selectModuleByNamespace, state } from "../Services/app.js";
    import eventbus from "../Services/eventbus.js";
    import { get } from "../Services/http.js";

    let namespace;
    let iframe;
    let svgUrl;
    let componentUrl;
    let planningSvgUrl;
    let htmlUrl;
    let scrollY = 0;
    let processing = false;
    let context = [];
    let module;
    let versionUrls = [];

    const generateUrls = (namespace) => {
        log("Generating URLS");
        scrollY =
            iframe && iframe.contentWindow ? iframe.contentWindow.scrollY : 0;

        if (!namespace) return;
        svgUrl = `/documents/${namespace}/data.svg?timestamp=${new Date().getMilliseconds()}`;
        componentUrl = `/documents/${namespace}/components.svg?timestamp=${new Date().getMilliseconds()}`;
        planningSvgUrl = `/documents/${namespace}/roadmap.svg?timestamp=${new Date().getMilliseconds()}`;
        htmlUrl = `/documents/${namespace}/page.html?timestamp=${new Date().getMilliseconds()}`;
    };

    let print = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    };

    let publish = () => {
        if (module) eventbus.broadcast("publish", module);
        setTimeout(async () => {
            versionUrls = await get(`/document/versions/${module.namespace}`);
        }, 1000);
    };

    let changeVersion = (url) => {
        console.log(url);
        if (!url)
            componentUrl = `/documents/${namespace}/components.svg?timestamp=${new Date().getMilliseconds()}`;
        else componentUrl = `/file?name=${url}`;
    };

    let runId;
    state.subscribe((s) => {
        if (s && s.module) {
            if (!module || module.namespace !== s.module.namespace) {
                module = s.module;
                (async () => {
                    versionUrls = await get(
                        `/document/versions/${module.namespace}`
                    );
                })();
            }
            if (processing && !s.processing) {
                if (iframe && !iframe.onload) {
                    iframe.onload = function () {
                        setTimeout(() => {
                            if (iframe && iframe.contentWindow)
                                iframe.contentWindow.scroll(0, scrollY);
                        });
                    };
                }

                setTimeout(() => {
                    if (runId !== s.runId) {
                        generateUrls(s.module.namespace);
                        runId = s.runId;
                    }
                });
            }

            if (s.module.namespace && s.module.namespace !== namespace) {
                namespace = s.module.namespace;
                generateUrls(s.module.namespace);
            }
        }

        if (!processing && s.processing) {
            processing = true;
        }
        if (processing && !s.processing) {
            setTimeout(() => {
                processing = s.processing;
            }, 300);
        }
    });
</script>

<div class="container">
    <div class="file-explorer--container">
        <FileExplorer />
    </div>
    {#if namespace}
        <div class="document-editor">
            <div>
                <DocumentEditor {context} />
            </div>
        </div>
        <div class="page-viewer">
            {#if processing}
                <div class="processing">
                    <i class="fa fa-spinner fa-spin fa-3x fa-fw" />
                </div>
            {/if}
            <Tabs>
                <TabList>
                    <Tab>Document</Tab>
                    <Tab>Architecture</Tab>
                    <Tab>Data Model</Tab>
                    <Tab>Planning</Tab>
                </TabList>

                <TabPanel>
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
                </TabPanel>

                <TabPanel>
                    <Panel style="height: calc(100% - 3rem); overflow:auto;">
                        {#if componentUrl}
                            <ImageViewer url={componentUrl} />
                        {/if}
                        <div class="version-container">
                            <div on:click={() => changeVersion()}>current</div>
                            {#each versionUrls as versionUrl (versionUrl.version)}
                                <div
                                    on:click={() =>
                                        changeVersion(versionUrl.componentUrl)}>
                                    {versionUrl.version}
                                </div>
                            {/each}
                        </div>
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
            <div class="publish-button" on:click={publish}>
                <i class="fa fa-cloud" />
            </div>
        </div>
    {/if}
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

            .processing {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 100;
                background: rgba(0, 0, 0, 0.5);

                i {
                    position: absolute;
                    bottom: 1rem;
                    right: 1rem;
                    color: black;
                    font-size: 5rem;
                }
            }
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
    .publish-button,
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
    .publish-button {
        right: 3rem;
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

    .version-container {
        color: var(--color-1);
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 99999;
    }
</style>
