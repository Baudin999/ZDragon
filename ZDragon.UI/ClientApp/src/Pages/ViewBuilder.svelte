<script>
    import Panel from "../Components/Panel.svelte";
    import Toggle from "../Components/Toggle.svelte";
    import { get } from "../Services/http";

    let index = [];

    setTimeout(async () => {
        var result = await get("/project/index");
        result.sort((a, b) => {
            var x = a.name.toLowerCase();
            var y = b.name.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        });
        index = result;
    });
</script>

<div style="max-height: 100%; overflow: auto;">
    {#each index as item}
        <div class="index--item">
            <Toggle /> <span class="name">{item.name}</span>
        </div>
    {/each}
</div>

<style lang="less">
    .index--item {
        .name {
            display: inline-block;
            margin-right: 1rem;
        }
        .namespace {
            display: none;
        }

        &:hover {
            .namespace {
                display: inline-block;
            }
        }
    }
</style>
