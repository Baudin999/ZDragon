<script>
    import File from "./File.svelte";
    import { moduleStore } from "../../Services/module";
    $: selectedModule = $moduleStore.selectedModule;

    export let domain;
    export let open = false;
    export let showSelf = true;
    export let indent = 0;
</script>

{#if open}
    {#if showSelf}
        <li on:click={() => (open = !open)}>
            <fa class="fa fa-folder-open-o" />{domain.namespace}
        </li>
    {/if}
    <ul class={`indent-${indent}`}>
        {#each domain.applications || [] as application}
            <li>
                <svelte:self domain={application} indent={indent + 1} />
            </li>
        {/each}
        {#each domain.modules || [] as module}
            <File
                {module}
                selected={module &&
                    selectedModule &&
                    module.fullName == selectedModule.fullName} />
        {/each}
    </ul>
{:else if showSelf}
    <li on:click={() => (open = !open)}>
        <fa class="fa fa-folder-o" />{domain.namespace}
    </li>
{/if}

<style type="less">
    fa {
        color: var(--color-secundary);
        display: inline-block;
        margin-right: 3px;
    }
</style>
