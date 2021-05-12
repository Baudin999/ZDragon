<script>
    import { selectModuleByNamespace, state } from "../Services/app";

    export let modules = [];
    export let title = "Modules";
    export let icon = "fa fa-cogs";

    let selectedModule = null;
    state.subscribe((s) => {
        selectedModule = s.module;
    });
</script>

{#if modules.length > 0}
    <h2>{title}</h2>
    {#each modules as module}
        <div
            class="item item--node"
            class:selected={selectedModule &&
                selectedModule.namespace === module.namespace}
            on:click={() => selectModuleByNamespace(module.namespace)}>
            <i class={icon} />{module.name}

            {#if selectedModule && selectedModule.namespace == module.namespace && false}
                <i class="edit-module fa fa-pencil" />
            {/if}
        </div>
    {/each}
{/if}

<style type="less">
    h2 {
        margin: 0;
        padding: 0;
        font-size: 0.6rem;
        text-transform: uppercase;
        margin-top: 10px;
    }

    .item {
        position: relative;
        margin-left: -1rem;
        padding: 0.5rem 0.5rem 0.5rem 1.5rem;
        &:hover {
            cursor: pointer;
            color: var(--color-3);

            .edit-module {
                display: block;
            }
        }
        .fa {
            display: inline-block;
            margin-right: 0.5rem;
        }

        &.selected {
            background: var(--color-3);
            color: var(--color-3--text);
        }

        .edit-module {
            display: block;
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
        }
    }
</style>
