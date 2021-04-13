<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";
    import { openProject } from "../Services/app";

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

            if (validateApp($app)) {
                let path = $app.path;
                openProject(path);
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
        <label for="project_path_001">Project Full Path</label>
        <input id="project_path_001" on:change={changeValue("path")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>

<style>
    .note {
        margin-bottom: 1rem;
    }
</style>
