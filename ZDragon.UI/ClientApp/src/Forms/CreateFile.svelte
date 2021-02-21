<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";
    import { getFiles, toggleAddFileDialog } from "../Services/state";

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
                getFiles();
            }
        } catch (err) {
            console.log(err);
        }
    };
</script>

<form class="form">
    <div class="form--field">
        <label for="aaa1">File Name</label>
        <input id="aaa1" on:change={changeValue("name")} />
    </div>

    <div class="form--field">
        <label for="aaa2">Type</label>
        <select id="aaa2" on:change={changeValue("type")}>
            <option>Feature</option>
            <option>Module</option>
            <option>Empty</option>
        </select>
    </div>

    <div class="form--field">
        <label for="aaa1">Application Name</label>
        <input id="aaa1" on:change={changeValue("appName")} />
    </div>

    <div class="form--field">
        <label for="aaa2">Description</label>
        <textarea id="aaa2" on:change={changeValue("description")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>
