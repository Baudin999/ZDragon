<script>
    import { post } from "./../Services/http";
    import { state, resetProjects, selectProject } from "./../Services/app";

    let projects = [];
    let selectedProject = null;

    state.subscribe((s) => {
        projects = s.projects || [];
        selectedProject = s.project;
    });
</script>

<div class="home">
    {#each projects as project}
        <div
            class="application"
            class:selected={selectedProject === project}
            on:click={() => selectProject(project)}>
            {#if selectedProject == project}
                <i class="fa fa-check" />
            {/if}
            <span>{project}</span>
        </div>
    {/each}
</div>
<div class="clear" on:click={resetProjects}>
    <i class="fa fa-times" />
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
            inline-size: 10rem;
            overflow-wrap: break-word;

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

    .clear {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        height: 20px;
        width: 20px;
        z-index: 9999;

        color: var(--color-1--font);

        i {
            height: 100%;
            width: 100%;
        }
        &:hover {
            cursor: pointer;
        }
    }
</style>
