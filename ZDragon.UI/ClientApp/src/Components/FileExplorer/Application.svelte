<script lang="typescript">
    import { selectModule } from "../../Services/module";

    // The application component
    export let application = null;

    let f = (n) => (application.modules || []).filter((m) => m.fileType === n);
    let features = f("Feature");
    let databases = f("Database");
    let endpoints = f("Endpoint");
    let components = f("Component");

    let onClick = (module) => () => selectModule(module);
</script>

{#if application}
    <div class="application">
        <title><i class="fa fa-institution" />{application.name}</title>
        {#each features as feature}
            <div class="item item--feature" on:click={onClick(feature)}>
                <i class="fa fa-diamond" />{feature.name}
            </div>
        {/each}
    </div>
{/if}

<style type="less">
    .application {
        display: block;
        padding: 0;
        margin: 0;
        margin-bottom: 1rem;

        title {
            padding: 0;
            margin: 0;
            background: orange;
            padding: 0 0.5rem;
            text-transform: uppercase;
            display: block;
            width: 100%;
        }

        .item {
            padding: 0 0.5rem;
            &:hover {
                cursor: pointer;
            }
            .fa {
                display: inline-block;
                margin-right: 0.5rem;
            }
        }
    }
</style>
