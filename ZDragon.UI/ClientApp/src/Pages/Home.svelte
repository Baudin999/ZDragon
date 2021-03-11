<script>
    import { post } from "./../Services/http";
    import { stateStore, selectApplication } from "./../Services/state";

    let applications = [];
    let selectedApp;

    var a = localStorage.getItem("applications");
    if (a != null) {
        applications = JSON.parse(a).sort();
    }

    let sa = async (app) => {
        selectApplication(app);
        let pUrl = app.replace(/\//g, "__$__").replace(/\\/g, "__$__");
        await post("/project/init/" + pUrl, {});
    };

    stateStore.subscribe((s) => {
        selectedApp = s.application;
    });
</script>

<div class="home">
    {#each applications as application}
        <div
            class="application"
            class:selected={selectedApp == application}
            on:click={() => sa(application)}>
            {#if selectedApp == application}
                <i class="fa fa-check" />
            {/if}
            <span>{application}</span>
        </div>
    {/each}
</div>

<style type="less">
    .home {
        padding: 1rem;
        display: flex;
        flex-wrap: wrap;

        .application {
            margin: 0.5rem;
            display: block;
            height: 10rem;
            width: 10rem;
            background-color: var(--color-1--border);
            color: var(--color-1--font);
            position: relative;
            font-size: 10px;

            i {
                position: absolute;
                top: 1rem;
                right: 1rem;
            }

            &.selected {
                background-color: var(--color-3);
            }

            &:hover {
                cursor: pointer;
            }

            span {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                user-select: none;
            }
        }
    }
</style>
