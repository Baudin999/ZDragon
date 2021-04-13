<script>
    import { getContext } from "svelte";
    import NavButton from "./NavButton.svelte";
    import { state } from "./../Services/app";
    import { ROUTER } from "svelte-routing/src/contexts";
    var { activeRoute } = getContext(ROUTER);

    export let url;

    let selectedProject;
    state.subscribe((s) => {
        selectedProject = s.project;
        // console.log(s);
    });

    $: {
        if ($activeRoute) url = $activeRoute.uri;
    }
</script>

<nav>
    <NavButton
        href="/"
        icon="fa fa-home"
        title="Home"
        selected={url == "/" || url == "/home"} />
    {#if selectedProject}
        <NavButton
            href="/editor"
            icon="fa fa-file"
            title="Editor"
            selected={url.indexOf("/editor") == 0} />
        <NavButton
            href="/reader"
            icon="fa fa-book"
            title="Reader"
            selected={url.indexOf("/reader") == 0} />
    {/if}

    <NavButton
        href="/logs"
        icon="fa fa-tasks"
        title="Logs"
        selected={url.indexOf("/logs") == 0} />
</nav>

<style type="less">
    nav {
        flex: 0;
        height: 100%;

        background: var(--color-1);
        color: var(--color-1--alt);
        padding: 0 1rem 1rem 1rem;

        text-align: center;

        display: grid;
        grid-auto-rows: 75px;
        row-gap: 0.5rem;
    }
</style>
