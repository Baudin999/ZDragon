<script>
    import File from "./File.svelte";
    export let directory;
</script>

<style type="less">
    ul {
        list-style: none;
        li:hover {
            cursor: pointer;
        }
    }

    fa {
        color: var(--color-secundary);
        display: inline-block;
        margin-right: 3px;
    }
</style>

<ul>
    {#each directory.directories as dir}
        <li>
            <fa class="fa fa-folder" />{dir.name}
        </li>
        <li>
            <svelte:self directory={dir} />
        </li>
    {/each}
    {#each directory.files as file}
        <File {file} />
    {/each}
</ul>
