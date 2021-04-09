<script>
    import { navigate } from "svelte-routing";
    export let href = undefined;
    export let title = "";
    export let onClick = () => {};
    export let selected = false;
    export let icon = undefined;
    export let restricted = false;
    export let link = false;

    const click = () => {
        if (onClick) onClick();
        if (href && !restricted) navigate(href);
    };
</script>

{#if icon}
    <span class="nav-button icon" class:selected class:link on:click={click}>
        <i class={icon} />
        <br />
        {#if title && title.length > 0}<span class="title">{title}</span>{/if}
    </span>
{:else}
    <span class="nav-button" class:selected class:link on:click={click}>
        {title}
    </span>
{/if}

<style type="less">
    .nav-button {
        display: inline-block;
        text-align: center;
        &:hover {
            cursor: pointer;
        }
        font-size: 0.8rem;
        padding-left: 1rem;
        margin-left: -1rem;
        padding-right: 1rem;
        margin-right: -1rem;
        padding-top: 1rem;
        border-left: 3px solid var(--color-1);

        font-weight: 100;

        &.selected {
            border-left: 3px solid var(--color-3);
            background: var(--color-1--bg);
        }

        transition: background-color 100ms ease-in-out;
    }
    .link {
        text-decoration: underline;
    }
    .link:hover {
        cursor: pointer;
    }
    .nav-button.icon i {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
    }
</style>
