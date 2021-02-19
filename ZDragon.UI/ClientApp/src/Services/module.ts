
import { writable } from "svelte/store";
import { getText, get, post } from "./http";

export const moduleStore = writable({});

export const selectModule = async module => {
    let result = await getModuleText(module);
    let text = result.text;
    let compilationResult = result.compilationResult;
    moduleStore.update((s: any) => {
        var nm = (s?.modules || {})[module.namespace] || module;
        var m = { ...nm, text, compilationResult };
        let modules = s?.modules || {};
        modules[module.namespace] = m;

        return {
            ...s,
            selectedModule: module.namespace,
            modules
        };
    });
};

export const parseCode = async (module, code) => {
    if (!module || !code) return;
    var compilationResult = await post("/document/" + module.namespace, { code });

    moduleStore.update((s: any) => {
        let m = { ...module, compilationResult };
        let modules = { ...s.modules, [module.namespace]: m }
        return {
            ...s,
            modules
        };
    });
};

const getModuleText = async (module) => {
    if (!module) return;

    var encodedURI = encodeURI(module.namespace);
    var url = `/document/${encodedURI}`;
    var result = await get(url);

    return result;
};
