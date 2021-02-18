<script>
    import { Link } from "svelte-routing";
    import NavButton from "./NavButton.svelte";
</script>

<style type="less">
    nav {
        flex: 0;
        width: 150px;
        background: var(--color-secundary);
        color: var(--color-secundary--alt);
        padding: 1rem;
        padding-top: 2rem;

        text-align: center;

        display: grid;
        grid-auto-rows: 75px;
        row-gap: 1rem;
    }
</style>

<nav>
    <NavButton href="/" icon="fa fa-home" title="Home" />
    <NavButton href="about" icon="fa fa-cogs" title="Abount" />
    <NavButton href="editor" icon="fa fa-file" title="Editor" />
</nav>
