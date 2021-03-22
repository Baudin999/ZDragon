<script>
    import { stateStore } from "../Services/state";
    import Panel from "../Components/Panel.svelte";

    let messages;

    stateStore.subscribe((s) => {
        messages = s.messages || [];
    });
</script>

<div>
    <Panel>
        {#each messages as message}
            <div class="message">
                {message.timestamp} - {message.message}
            </div>
        {/each}
    </Panel>
</div>
