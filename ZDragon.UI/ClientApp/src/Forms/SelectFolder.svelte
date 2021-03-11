<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";

    export let close;

    var app = writable();
    const changeValue = (name) => (e) => {
        $app = { ...$app, [name]: e.target.value };
    };

    const submitForm = async () => {
        try {
            let validateApp = ({ path }) => {
                return path;
            };
            let isValid = validateApp($app);
            if (isValid) {
                let path = $app.path
                    .replace(/\//g, "__$__")
                    .replace(/\\/g, "__$__");

                await post("/project/init/" + path, {});
                close();
            }
        } catch (err) {
            console.log(err);
        }
    };
</script>

<form class="form">
    <div class="note">
        Because of the limitations of the web we cannot select a directory from
        the file system. This is why we will need a full path to open the
        correct directory.
    </div>
    <div class="form--field">
        <label for="ca_001">Folder Full Path</label>
        <input id="ca_001" on:change={changeValue("path")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>

<style>
    .note {
        margin-bottom: 1rem;
    }
</style>
