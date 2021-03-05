<script>
    import { navigate } from "svelte-routing";
    import { selectModule } from "../../Services/module";

    export let module;
    export let selected = false;

    const moduleSelected = () => {
        //selectModule(module);
        let path = "/editor/" + module.namespace;
        console.log(path);
        navigate(path);
    };
</script>

<li class:selected on:click={moduleSelected}>
    <fa class="fa fa-file-o" />{module.namespace}
</li>

<style>
    fa {
        color: var(--color-secundary);
        display: inline-block;
        margin-right: 3px;
    }
</style>
