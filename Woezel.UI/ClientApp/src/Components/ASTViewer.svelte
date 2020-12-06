<script>
    import JSONTree from "svelte-json-tree";
    import { astStore } from "./../Services/ast";
    import Panel from "./Panel.svelte";

    var value = {};

    astStore.subscribe((s) => {
        value = s;
    });
</script>

<Panel>
    <JSONTree {value} isParentExpanded={true} />
</Panel>
