<script>
    import { createEventDispatcher } from "svelte";
    export let title = "Unknown Modal";
    export let show = false;
    export let close = () => {};
    export let size = "normal";
</script>

<div class="background" class:show />

<div class="modal {size}" class:show>
    <div class="title">
        {title}
        <i on:click|stopPropagation={close} class="fa fa-times" />
    </div>

    <div class="content">
        <slot />
    </div>
</div>

<style>
    .background {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        right: 0;
        z-index: 9998;
        background: rgba(20, 20, 20, 0.6);
        display: none;
    }
    .background.show {
        display: block;
    }
    .modal {
        position: fixed;
        z-index: 9999;
        border: 1px solid var(--color-1--border);
        padding: 0;
        margin: 0;

        width: 600px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: none;
        background: var(--color-1);
    }
    .modal.normal {
        width: 600px;
    }
    .modal.wide {
        width: 1200px;
    }
    .modal.show {
        display: block;
    }
    .title {
        background: var(--color-1--bg);
        color: var(--color-1--font);
        padding: 0;
        padding: 1rem 2rem;
    }
    .title i {
        float: right;
    }
    .title i:hover {
        cursor: pointer;
    }
    .content {
        padding: 1rem;
    }
</style>
