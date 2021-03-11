<script>
    import { writable } from "svelte/store";
    import { post } from "../Services/http";
    import { toggleAddApplicationDialog } from "../Services/state";

    var app = writable();
    const changeValue = (name) => (e) => {
        $app = { ...$app, [name]: e.target.value };
    };

    const submitForm = async () => {
        try {
            let validateApp = ({ name }) => {
                return name;
            };
            let isValid = validateApp($app);
            if (isValid) {
                await post("/application", $app);
                toggleAddApplicationDialog();
            }
        } catch (err) {
            console.log(err);
        }
    };
</script>

<form class="form">
    <div class="form--field">
        <label for="ca_001">Application Name</label>
        <input id="ca_001" on:change={changeValue("name")} />
    </div>

    <button on:click={submitForm} type="button">Submit</button>
</form>
