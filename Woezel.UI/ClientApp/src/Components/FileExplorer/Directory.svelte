<script>
    import File from "./File.svelte";
    import { documentStore } from "../../Services/file";
    $: selectedFile = $documentStore.selectedFile;

    export let directory;
    export let open = false;
    export let showSelf = true;
    export let indent = 0;
</script>

<style type="less">
    fa {
        color: var(--color-secundary);
        display: inline-block;
        margin-right: 3px;
    }
</style>

{#if open}
    {#if showSelf}
        <li on:click={() => (open = !open)}>
            <fa class="fa fa-folder-open-o" />{directory.name}
        </li>
    {/if}
    <ul class={`indent-${indent}`}>
        {#each directory.directories as dir}
            <li>
                <svelte:self directory={dir} indent={indent + 1} />
            </li>
        {/each}
        {#each directory.files as file}
            <File
                {file}
                selected={file && selectedFile && file.id == selectedFile.id} />
        {/each}
    </ul>
{:else if showSelf}
    <li on:click={() => (open = !open)}>
        <fa class="fa fa-folder-o" />{directory.name}
    </li>
{/if}
