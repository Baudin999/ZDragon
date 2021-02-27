<script>
    import {
        toggleAddApplicationDialog,
        toggleAddFileDialog,
    } from "../../Services/state.js";
</script>

<div class="toolbar">
    <div on:click={toggleAddFileDialog}><i class="fa fa-file-o" /></div>
    <div on:click={toggleAddApplicationDialog}>
        <i class="fa fa-folder-o" />
    </div>
</div>

<style type="less">
    .toolbar {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        i {
            display: inline-block;
            margin-left: 0.5rem;
            &:hover {
                cursor: pointer;
                color: var(--color-secundary);
            }
        }
    }
</style>
