<script>
    import { Link } from "svelte-routing";
    import NavButton from "./NavButton.svelte";
    import { stateStore } from "./../Services/state";

    let selectedApp;
    stateStore.subscribe((s) => {
        selectedApp = s.application;
    });
</script>

<nav>
    <NavButton href="/" icon="fa fa-home" title="Home" />
    {#if selectedApp}
        <NavButton href="editor" icon="fa fa-file" title="Editor" />
    {/if}
    <NavButton href="json-designer" icon="fa fa-file-code-o" title="Json" />
    <NavButton href="logs" icon="fa fa-tasks" title="Logs" />
    <NavButton href="view-builder" icon="fa fa-tasks" title="View Builder" />
</nav>

<style type="less">
    nav {
        flex: 0;
        height: 100%;

        background: var(--color-1);
        color: var(--color-1--alt);
        padding: 1rem;
        padding-top: 2rem;

        text-align: center;

        display: grid;
        grid-auto-rows: 75px;
        row-gap: 1rem;
    }
</style>
