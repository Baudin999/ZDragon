import { writable } from "svelte/store";



const appStore = new writable({});

export const selectApp = app => {
    if (app === null) return;

    return {
        ...$appStore,
        selectedApp: app
    };
};

export const selectModuleByNamespace = namespace => {
    return {
        ...$appStore,
        selectedModule: namespace
    };
};