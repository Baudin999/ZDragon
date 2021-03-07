<script>
    import { Link } from "svelte-routing";
    import NavButton from "./NavButton.svelte";
</script>

<nav>
    <NavButton href="/" icon="fa fa-home" title="Home" />
    <NavButton href="editor" icon="fa fa-file" title="Editor" />
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
