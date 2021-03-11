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
