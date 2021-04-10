<script>
    export let icon;
    export let title;

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    const clicked = () => {
        dispatch("click", title);
    };
</script>

<div class="app--toole-bar--item" on:click={clicked}>
    <div class="inner">
        <i class={icon} />
        <span>{title}</span>
    </div>
</div>

<style type="less">
    .app--toole-bar--item {
        margin: 0;
        padding: 0;
        width: 10rem;
        border-left: 1px solid var(--color-1--border);
        border-right: 1px solid var(--color-1--border);
        height: 100%;
        position: relative;
        user-select: none;

        &:hover {
            cursor: pointer;
            background-color: var(--color-2);
        }

        .inner {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            i {
                display: inline-block;
                margin-right: 0.5rem;
                margin-top: 1px;
            }
            span {
                white-space: nowrap;
            }
        }
    }
</style>
