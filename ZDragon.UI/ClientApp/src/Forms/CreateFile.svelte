<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";

    var file = writable({});
    const changeValue = (name) => (e) => {
        $file = { ...$file, [name]: e.target.value };
    };

    const submitForm = async () => {
        try {
            var result = await post("/document", $file);
            console.log(result);
        } catch (err) {
            console.log(err);
        }
    };
</script>

<form class="form">
    <div class="form--field">
        <label for="aaa1">Name</label>
        <input id="aaa1" on:change={changeValue("name")} />
    </div>

    <div class="form--field">
        <label for="aaa2">Type</label>
        <select id="aaa2" on:change={changeValue("type")}>
            <option>Feature</option>
            <option>Module</option>
        </select>
    </div>

    <div class="form--field">
        <label for="aaa2">Description</label>
        <textarea id="aaa2" on:change={changeValue("description")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>
