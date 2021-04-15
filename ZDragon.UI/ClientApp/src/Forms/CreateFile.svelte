<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";
    import { state, toggleAddFileDialog } from "../Services/app";

    var file = writable({
        type: "Component",
    });

    const submitForm = async () => {
        try {
            let validateFile = ({ name, type, appName }) => {
                return name && type && appName;
            };
            let isValid = validateFile($file);
            if (isValid) {
                await post("/file/.", $file);
                toggleAddFileDialog();
            }
        } catch (err) {
            console.log(err);
        }
    };

    state.subscribe((s) => {
        if (!s.application) return;
        file.update((f) => {
            return {
                ...f,
                appName: s.application.name,
            };
        });
    });
</script>

<form class="form">
    <div class="form--field">
        <label for="cf_001">File Name</label>
        <input id="cf_001" bind:value={$file.name} />
    </div>

    <div class="form--field">
        <label for="cf_002">Type</label>
        <select id="cf_002" bind:value={$file.type}>
            <option />
            <option>Component</option>
            <option>Feature</option>
            <option>Database</option>
            <option>Endpoint</option>
            <option>Model</option>
            <option>Story</option>
            <option>Documentation</option>
            <option>Empty</option>
        </select>
    </div>

    <div class="form--field">
        <label for="cf_003">Application Name</label>
        <input id="cf_003" bind:value={$file.appName} />
        <!-- on:change={changeValue("appName")} /> -->
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>
