<script>
    import { writable } from "svelte/store";

    import { state, toggleRefactoringDialog } from "../Services/app.js";
    import eventbus from "../Services/eventbus.js";

    let schema = "";

    state.subscribe((s) => {
        schema = s.schema;
    });
</script>

<div class="jsonschema-content">
    {#if schema}
        <pre>
        {schema}
    </pre>
    {/if}
</div>

<style type="less">
    .jsonschema-content {
        display: block;
        max-height: 500px;
        overflow: auto;
        color: white;
    }
</style>
