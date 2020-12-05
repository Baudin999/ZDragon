<script>
    import { selectFile } from "../../Services/file";

    export let file;

    const fileSelected = () => {
        selectFile(file);
    };
</script>

<style>
    fa {
        color: var(--color-secundary);
        display: inline-block;
        margin-right: 3px;
    }
    li:hover {
        cursor: pointer;
    }
</style>

<li on:click={fileSelected}>
    <fa class="fa fa-file" />{file.name}
</li>
