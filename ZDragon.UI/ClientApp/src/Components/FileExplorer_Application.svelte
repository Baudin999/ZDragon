<script>
    import eventbus from "../Services/eventbus";
    import { setApplicationInterator } from "../Services/app";
    import FileExplorerApplicationModule from "./FileExplorer_Application_Module.svelte";

    // The application component
    export let application = null;
    export let selected = false;

    let modules = [];

    let f = (n) => (modules || []).filter((m) => m.fileType === n);

    let features = [];
    let databases = [];
    let endpoints = [];
    let components = [];
    let models = [];
    let documents = [];

    $: {
        if (application.modules.length !== modules.length) {
            modules = application.modules;
            features = f("Feature");
            databases = f("Database");
            endpoints = f("Endpoint");
            components = f("Component");
            models = f("Model");
            documents = f("Documentation");
        }
    }
</script>

{#if application}
    <div class="application">
        <title on:click={() => setApplicationInterator(application)}
            ><i class="fa fa-institution" />{application.name}
        </title>
        {#if selected}
            <div class="application--details">
                <FileExplorerApplicationModule
                    modules={components}
                    title="Components"
                    icon="fa fa-cogs" />

                <FileExplorerApplicationModule
                    modules={endpoints}
                    title="Endpoints"
                    icon="fa fa-envelope" />

                <FileExplorerApplicationModule
                    modules={features}
                    title="Features"
                    icon="fa fa-diamond" />

                <FileExplorerApplicationModule
                    modules={models}
                    title="Models"
                    icon="fa fa-cubes" />

                <FileExplorerApplicationModule
                    modules={databases}
                    title="Databases"
                    icon="fa fa-database" />

                <FileExplorerApplicationModule
                    modules={documents}
                    title="Documents"
                    icon="fa fa-file-text-o" />
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
    }
</style>
