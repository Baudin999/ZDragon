<script>
    import { navigate } from "svelte-routing";
    import eventbus from "../../Services/eventbus";
    import { moduleStore, selectModule } from "../../Services/module";

    // The application component
    export let application = null;
    export let selectedApplication = null;

    let f = (n) => (application.modules || []).filter((m) => m.fileType === n);
    let features = f("Feature");
    let databases = f("Database");
    let endpoints = f("Endpoint");
    let components = f("Component");
    let models = f("Model");
    let documents = f("Documentation");

    let onClick = (module) => () => {
        // let path = "/editor/" + module.namespace;
        // navigate(path);
        eventbus.broadcast("navigate", { namespace: module.namespace });
        selectModule(module);
    };
    let selectApplication = () => {
        if (selectedApplication) selectedApplication = null;
        else {
            selectedApplication = application.namespace;
        }
    };

    moduleStore.subscribe((s) => {
        if (application && s && s.selectedModule) {
            if (s.selectedModule.indexOf(application.namespace) === 0) {
                selectedApplication = application.namespace;
            }
        }
    });
</script>

{#if application}
    <div class="application">
        <title on:click={selectApplication}
            ><i class="fa fa-institution" />{application.name}</title>
        {#if selectedApplication === application.namespace}
            <div class="application--details">
                {#if components.length > 0}
                    <h2>Components</h2>
                    {#each components as node}
                        <div
                            class="item item--node"
                            class:selected={node.namespace ==
                                $moduleStore.selectedModule}
                            on:click={onClick(node)}>
                            <i class="fa fa-cogs" />{node.name}
                        </div>
                    {/each}
                {/if}

                {#if endpoints.length > 0}
                    <h2>Endpoints</h2>
                    {#each endpoints as node}
                        <div
                            class="item item--node"
                            class:selected={node.namespace ==
                                $moduleStore.selectedModule}
                            on:click={onClick(node)}>
                            <i class="fa fa-envelope" />{node.name}
                        </div>
                    {/each}
                {/if}

                {#if features.length > 0}
                    <h2>Features</h2>
                    {#each features as node}
                        <div
                            class="item item--node"
                            class:selected={node.namespace ==
                                $moduleStore.selectedModule}
                            on:click={onClick(node)}>
                            <i class="fa fa-diamond" />{node.name}
                        </div>
                    {/each}
                {/if}

                {#if models.length > 0}
                    <h2>Models</h2>
                    {#each models as node}
                        <div
                            class="item item--node"
                            class:selected={node.namespace ==
                                $moduleStore.selectedModule}
                            on:click={onClick(node)}>
                            <i class="fa fa-diamond" />{node.name}
                        </div>
                    {/each}
                {/if}

                {#if databases.length > 0}
                    <h2>Databases</h2>
                    {#each databases as node}
                        <div
                            class="item item--node"
                            class:selected={node.namespace ==
                                $moduleStore.selectedModule}
                            on:click={onClick(node)}>
                            <i class="fa fa-database" />{node.name}
                        </div>
                    {/each}
                {/if}

                {#if documents.length > 0}
                    <h2>Documents</h2>
                    {#each documents as node}
                        <div
                            class="item item--node"
                            class:selected={node.namespace ==
                                $moduleStore.selectedModule}
                            on:click={onClick(node)}>
                            <i class="fa fa-diamond" />{node.name}
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
{/if}

<style type="less">
    .application {
        display: block;
        padding: 0;
        margin: 0;
        border-bottom: 1px solid var(--color-1--bg);
        font-size: 12px;

        user-select: none;

        & * {
            user-select: none;
        }

        .application--details {
            padding-left: 1rem;
        }

        title {
            padding: 0;
            margin: 0;
            background: var(--color-1--border);
            padding: 0.5rem;
            display: block;
            width: 100%;

            i {
                display: inline-block;
                margin-right: 0.5rem;
            }
        }

        h2 {
            margin: 0;
            padding: 0;
            font-size: 0.6rem;
            text-transform: uppercase;
            margin-top: 10px;
        }

        .item {
            margin-left: -1rem;
            padding: 0.5rem 0.5rem 0.5rem 1.5rem;
            &:hover {
                cursor: pointer;
                color: var(--color-3);
            }
            .fa {
                display: inline-block;
                margin-right: 0.5rem;
            }

            &.selected {
                background: var(--color-3);
                color: var(--color-3--text);
            }
        }
    }
</style>
