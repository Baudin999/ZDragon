<script>
    import { writable } from "svelte/store";
    import { post } from "./../Services/http";

    var domain = writable({});
    const changeValue = (name) => (e) => {
        $domain = { ...$domain, [name]: e.target.value };
    };

    const submitForm = async () => {
        try {
            var result = await post("/domain", $domain);
            console.log(result);
        } catch (err) {
            console.log(err);
        }
    };
</script>

<form class="form">
    <div class="form--field">
        <label for="1">Name</label>
        <input id="1" on:change={changeValue("name")} />
    </div>

    <div class="form--field">
        <label for="2">Description</label>
        <textarea id="2" on:change={changeValue("description")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>
