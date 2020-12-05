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

<style type="less">
    .nav-button {
        display: inline-block;
        text-align: center;
        &:hover {
            cursor: pointer;
        }
    }
    .link {
        text-decoration: underline;
    }
    .link:hover {
        cursor: pointer;
    }
    .nav-button.icon i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
</style>

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
