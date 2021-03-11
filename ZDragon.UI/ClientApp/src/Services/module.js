
import { writable, get as _get } from "svelte/store";
import { getText, get, post } from "./http";

export const moduleStore = writable({
    modules: []
});

export const reset = () => {
    moduleStore.update(() => {
        return { modules: [] };
    });
};

export const selectModuleByNamespace = async namespace => {
    if (!namespace) return;
    let result = await getModuleText(namespace);
    let text = result.text;
    let compilationResult = result.compilationResult;
    moduleStore.update(s => {
        var m = { namespace, text, compilationResult };
        let modules = (s || {}).modules || {};
        modules[namespace] = m;

        return {
            ...s,
            selectedModule: namespace,
            modules
        };
    });

};

export const selectModule = async module => {
    if (!module || !module.namespace) return;
    let result = await getModuleText(module.namespace);
    let text = result.text;
    let compilationResult = result.compilationResult;
    moduleStore.update(s => {
        var nm = ((s || {}).modules || {})[module.namespace] || module;
        var m = { ...nm, text, compilationResult };
        let modules = (s || {}).modules || {};
        modules[module.namespace] = m;

        return {
            ...s,
            selectedModule: module.namespace,
            modules
        };
    });
};

export const deleteModule = async module => {
    console.log(module);
};

export const parseCode = async (module, code) => {

    if (!module || !module.namespace || !code) {
        console.log("Invalid \"Parse Code\"", module, code);

        return;
    }
    var compilationResult = await post("/document/" + module.namespace, { code });

    moduleStore.update(s => {
        let m = { ...module, compilationResult };
        let modules = { ...s.modules, [module.namespace]: m };
        return {
            ...s,
            modules
        };
    });
};

const getModuleText = async (namespace) => {
    if (!namespace) return;
    var encodedURI = encodeURI(namespace);
    var url = `/document/${encodedURI}`;
    var result = await get(url);

    return result;
};
