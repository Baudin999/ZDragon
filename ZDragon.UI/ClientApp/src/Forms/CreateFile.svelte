<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";
    import { toggleAddFileDialog } from "../Services/state";

    var file = writable({
        type: "Feature",
    });
    const changeValue = (name) => (e) => {
        $file = { ...$file, [name]: e.target.value };
    };

    const submitForm = async () => {
        try {
            let validateFile = ({ name, type, appName, description }) => {
                return name && type;
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
</script>

<form class="form">
    <div class="form--field">
        <label for="cf_001">File Name</label>
        <input id="cf_001" on:change={changeValue("name")} />
    </div>

    <div class="form--field">
        <label for="cf_002">Type</label>
        <select id="cf_002" value={$file.type} on:change={changeValue("type")}>
            <option />
            <option>Component</option>
            <option>Feature</option>
            <option>Database</option>
            <option>Endpoint</option>
            <option>Model</option>
            <option>Empty</option>
        </select>
    </div>

    <div class="form--field">
        <label for="cf_003">Application Name</label>
        <input id="cf_003" on:change={changeValue("appName")} />
    </div>

    <div class="form--field">
        <label for="cf_004">Description</label>
        <textarea id="cf_004" on:change={changeValue("description")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>
