<script>
    import {
        toggleAddApplicationDialog,
        toggleAddFileDialog,
    } from "../../Services/state";
    import ToolbarItem from "./ToolbarItem.svelte";
</script>

<div class="app--toolbar">
    <div class="filler">
        <img style="height:1.5rem;" src="favicon.ico" alt="fav" />
        ZDragon
    </div>
    <ToolbarItem icon="fa fa-plus" title="New" on:click={toggleAddFileDialog} />
    <ToolbarItem
        icon="fa fa-folder"
        title="Open"
        on:click={toggleAddApplicationDialog} />
    <ToolbarItem icon="fa fa-floppy-o" title="Save" />
</div>

<style type="less">
    .filler {
        height: 3rem;
        line-height: 3rem;
        padding: 0 1rem 0 3rem;
        position: relative;
        img {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
        }
    }
    .app--toolbar {
        font-size: 0.8rem;
        margin: 0;
        padding: 0;
        width: 100%;
        height: 3rem;
        background-color: var(--color-1--bg);
        border-bottom: 1px solid var(--color-1--border);
        flex: 0;
        display: flex;
        flex-direction: row;

        align-items: flex-start;
        justify-content: flex-start;
    }
</style>
