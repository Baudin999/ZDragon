<script>
    import { navigate } from "svelte-routing";
    import { getContext } from "svelte";
    import NavButton from "./NavButton.svelte";
    import { stateStore } from "./../Services/state";
    import { ROUTER } from "svelte-routing/src/contexts";
    import eventbus from "../Services/eventbus";
    var { activeRoute } = getContext(ROUTER);

    export let url;

    let selectedApp;
    stateStore.subscribe((s) => {
        selectedApp = s.application;
    });

    eventbus.subscribe("navigate", (item) => {
        navigate("/editor/" + item.namespace);

        if (item.position) {
            setTimeout(() => {
                eventbus.broadcast("navigateToToken", item.position);
            }, 500);
        }
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
    {#if selectedApp}
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
        href="/json-designer"
        icon="fa fa-file-code-o"
        title="Json"
        selected={url.indexOf("/json-designer") == 0} />
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
