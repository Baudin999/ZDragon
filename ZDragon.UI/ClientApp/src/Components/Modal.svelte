<script>
    import { createEventDispatcher } from "svelte";
    export let title = "Unknown Modal";
    export let show = false;
    export let close = () => {};
</script>

<div class="background" class:show />

<div class="modal" class:show>
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
        background: rgba(20, 20, 20, 0.2);
        display: none;
    }
    .background.show {
        display: block;
    }
    .modal {
        position: fixed;
        z-index: 9999;
        border: 1px solid gray;
        padding: 0;
        margin: 0;

        width: 600px;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        display: none;
        background: white;
    }
    .modal.show {
        display: block;
    }
    .title {
        background: var(--color-primary);
        color: var(--color-primary--alt);
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
