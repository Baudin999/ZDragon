<script>
    import ToolbarItem from "./ToolbarItem.svelte";
    import {
        state,
        toggleAddApplicationDialog,
        toggleAddFileDialog,
        toggleAddProjectDialog,
    } from "../Services/app";

    let hasProjectSelected;

    state.subscribe((s) => {
        hasProjectSelected = !!s.project;
    });
</script>

<div class="app--toolbar">
    <div class="filler">
        <img style="height:1.5rem;" src="favicon.ico" alt="fav" />
        ZDragon
    </div>
    {#if hasProjectSelected}
        <ToolbarItem
            icon="fa fa-plus"
            title="New App"
            on:click={toggleAddApplicationDialog} />
        <ToolbarItem
            icon="fa fa-plus"
            title="New File"
            on:click={toggleAddFileDialog} />
    {/if}
    <ToolbarItem
        icon="fa fa-folder"
        title="Open"
        on:click={toggleAddProjectDialog} />
    <!-- <ToolbarItem icon="fa fa-floppy-o" title="Save" /> -->

    <div class="app--toolbar--close">
        <i class="fa fa-times" />
    </div>
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

        -webkit-app-region: drag !important;

        &--close {
            display: inline-block;
            position: absolute;
            right: 1rem;
            color: var(--color-1--font);
            height: 1rem;
            width: 1rem;
            // background: maroon;
            top: 1rem;

            &:hover {
                cursor: pointer;
            }
        }
    }
</style>
