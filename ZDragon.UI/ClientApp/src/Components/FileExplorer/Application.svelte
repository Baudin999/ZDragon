<script>
    import { moduleStore, selectModule } from "../../Services/module";

    // The application component
    export let application = null;

    let selectedApplication = null;

    let f = (n) => (application.modules || []).filter((m) => m.fileType === n);
    let features = f("Feature");
    let databases = f("Database");
    let endpoints = f("Endpoint");
    let components = f("Component");

    let onClick = (module) => () => selectModule(module);
    let selectApplication = () => {
        if (selectedApplication) selectedApplication = null;
        else {
            selectedApplication = application.namespace;
        }
    };
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
            </div>
        {/if}
    </div>
{/if}

<style type="less">
    .application {
        display: block;
        padding: 0;
        margin: 0;
        margin-bottom: 1rem;

        .application--details {
            padding-left: 1rem;
        }

        title {
            padding: 0;
            margin: 0;
            background: var(--color-primary);
            color: var(--color-primary--alt);
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
            font-size: 1rem;
        }

        .item {
            margin-left: -1rem;
            padding: 0.5rem 0.5rem 0.5rem 1.5rem;
            &:hover {
                cursor: pointer;
                color: var(--color-secundary);
            }
            .fa {
                display: inline-block;
                margin-right: 0.5rem;
            }

            &.selected {
                background: var(--color-secundary);
                color: var(--color-secundary--alt);
            }
        }
    }
</style>
