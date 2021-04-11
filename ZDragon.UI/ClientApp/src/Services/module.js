import { navigate } from "svelte-routing";
import { writable, get as _get } from "svelte/store";
import eventbus from "./eventbus";
import { getText, get, post } from "./http";

/*

Shape of the moduleStore

{
    modules: List Module             Array of Modules
    selectedModule: String
    processing: Boolean
}

*/


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

export const resetModule = async () => {
    moduleStore.update(s => {
        return {
            ...s,
            selectedModule: null
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

export const saveCode = async (code) => {

    if (code == "") code = " ";

    var ms = _get(moduleStore);
    var module = ms.modules[ms.selectedModule];

    if (!module || !module.namespace || !code) {
        console.log("Invalid \"Parse Code\"", module, code);
        return;
    }
    moduleStore.update(s => ({
        ...s,
        processing: true
    }));
    var compilationResult = await post("/document/" + module.namespace, { code: code.trim() });

    moduleStore.update(s => {
        let m = { ...module, compilationResult };
        let modules = { ...s.modules, [module.namespace]: m };
        return {
            ...s,
            modules,
            processing: false
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

eventbus.subscribe("saving", text => {
    // save the module
    saveCode(text);
});


eventbus.subscribe("navigateTo", async term => {
    var store = _get(moduleStore);
    var namespace = store.selectedModule;
    if (!term || !namespace) return;
    else {
        var fragment = await get("/document/find/" + namespace + "/" + term);
        console.log(fragment);
        eventbus.broadcast("navigate", fragment);
    }
});


const navigationStack = [];
eventbus.subscribe("navigate", (fragment) => {
    var store = _get(moduleStore);
    if (fragment.namespace !== store.selectedModule && fragment.namespace) {
        if (navigationStack.indexOf(fragment.namespace) == -1) {
            navigationStack.push(fragment.namespace);
        }
        navigate("/editor/" + fragment.namespace);
    }
    else if (fragment && fragment.indexOf(".") > -1) {
        // probably a namespace passed into the function
        navigate("/editor/" + fragment.namespace);
    }

    if (fragment.position) {
        setTimeout(() => {
            var pos = {
                lineNumber: fragment.position.lineStart + 1,
                column: fragment.position.columnStart + 1,
            };
            console.log(pos);
            eventbus.broadcast("navigateToToken", pos);
        }, 500);
    }


});

eventbus.subscribe("back", () => {
    // not working yet...
    if (navigationStack.length > 0) {
        var store = _get(moduleStore);
        let namespace = navigationStack.pop();
        while (namespace == store.selectedModule) {
            namespace = navigationStack.pop();
        }
        if (namespace !== store.selectedModule && namespace) {
            navigate("/editor/" + namespace);
        }
    }
});