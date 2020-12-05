<script>
    import { selectFile } from "../../Services/file";

    export let file;
    export let selected = false;

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
</style>

<li class:selected on:click={fileSelected}>
    <fa class="fa fa-file-o" />{file.name}
</li>
