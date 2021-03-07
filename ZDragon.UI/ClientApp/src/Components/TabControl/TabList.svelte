<div class="tab-list">
    <slot />
</div>

<div class="tab-list--sep" />

<style>
    .tab-list {
        background: var(--color-1);
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3rem;
        z-index: 9999;
    }
    .tab-list--sep {
        margin-top: 3rem;
    }
</style>
