<script>
    import { stateStore } from "../Services/state.js";
    let name = "Foo";

    stateStore.subscribe((s) => {
        var refactoring = s.refactoring;
        name = refactoring.name;
    });
</script>

<div>Refactor: {name}</div>
