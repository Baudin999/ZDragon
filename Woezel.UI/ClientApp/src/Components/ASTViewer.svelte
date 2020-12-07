<script type="ts">
    import { onMount } from "svelte";
    import { astStore } from "./../Services/ast";
    import Editor from "./Editor.svelte";
    import Panel from "./Panel.svelte";

    var text;

    astStore.subscribe((s: any) => {
        if (s) {
            text = JSON.stringify(s, null, 4);
        }
    });
</script>

<style>
</style>

{#if text}
    <Editor language="json" {text} />
{/if}
