import { navigate as sr_navigate } from "svelte-routing";
import { writable, get as _get } from "svelte/store";
import eventbus from "./eventbus";
import { get, post } from "./http";


export const state = writable({
    modules: []
});

export const reset = () => {
    state.update(() => {
        return {
            processing: false,
            module: null
        };
    });
};

export const selectModuleByNamespace = async namespace => {
    try {
        if (!namespace) return;
        let moduleResult = await getModuleFromServer(namespace);

        // set the last module
        localStorage.setItem("lastModule", JSON.stringify({
            namespace: moduleResult.namespace,
            application: moduleResult.applicationName
        }));

        state.update(s => {
            return {
                ...s,
                module: { ...moduleResult },
                application: (s.applications || []).find(a => a.name == moduleResult.applicationName)
            };
        });
    } catch (ex) {

        state.update(s => {
            return {
                ...s,
                module: null,
                application: null
            };
        });
    }
};

export const resetModule = async () => {
    state.update(s => {
        return {
            ...s,
            module: null
        };
    });
};


export const deleteModule = async module => {
    // not implemented yet
    console.log(module);
};

export const saveCode = async (code) => {

    if (code == "") code = " ";

    var ms = _get(state);
    var module = ms.module;

    if (!module || !module.namespace || !code) {
        console.log("Invalid \"Parse Code\"", module, code);
        return;
    }
    // start processing
    state.update(s => ({
        ...s,
        processing: true
    }));

    // get the compilation result and fix the current module
    var compilationResult = await post("/document/" + module.namespace, { code: code });
    state.update(s => {
        return {
            ...s,
            processing: false,
            runId: getTicks(),
            module: {
                ...s.module,
                //text: code,
                compilationResult: compilationResult
            }
        };
    });
};

const getTicks = () => {
    var yourDate = new Date();  // for example

    // the number of .net ticks at the unix epoch
    var epochTicks = 621355968000000000;

    // there are 10000 .net ticks per millisecond
    var ticksPerMillisecond = 10000;

    // calculate the total number of .net ticks for your date
    var yourTicks = epochTicks + (yourDate.getTime() * ticksPerMillisecond);

    return yourTicks;
};

export const compile = async (code) => {
    if (code == "") code = " ";

    var ms = _get(state);
    var module = ms.module;

    if (!module || !module.namespace || !code) {
        console.log("Invalid \"Parse Code\"", module, code);
        return;
    }

    // get the compilation result and fix the current module
    var compilationResult = await post("/document/compile/" + module.namespace, { code: code });
    state.update(s => {

        //

        return {
            ...s,
            module: {
                ...s.module,
                compilationResult: compilationResult
            }
        };
    });
};

const getModuleFromServer = async (namespace) => {
    if (!namespace) return;
    var encodedURI = encodeURI(namespace);
    var url = `/document/${encodedURI}`;
    var result = await get(url);

    return result;
};

/** MODAL TOGGLES */

export const toggleAddFileDialog = () => {
    state.update((s) => ({
        ...s,
        showAddFileDialog: !!!s.showAddFileDialog
    }));
};


export const toggleAddApplicationDialog = () => {
    state.update((s) => ({
        ...s,
        showAddApplicationDialog: !!!s.showAddApplicationDialog
    }));
};

export const toggleAddProjectDialog = () => {
    state.update((s) => ({
        ...s,
        showAddProjectDialog: !!!s.showAddProjectDialog
    }));
};

export const toggleRefactoringDialog = () => {
    state.update((s) => ({
        ...s,
        showRefactoringDialog: !!!s.showRefactoringDialog
    }));
};

export const toggleJsonSchemaDialog = () => {
    state.update((s) => ({
        ...s,
        showJsonSchemaDialog: !!!s.showJsonSchemaDialog
    }));
};

/** PROJECT FUNCTIONS */

export const resetProjects = () => {
    localStorage.removeItem("projects");
    localStorage.removeItem("last opened project");
    state.update(s => ({
        ...s,
        projects: [],
        project: null
    }));
};

export const loadProjects = () => {
    var projectsJson = localStorage.getItem("projects");
    if (projectsJson != null) {
        var projects = JSON.parse(projectsJson);

        state.update(s => ({
            ...s,

            // all the projects in our project cache
            projects,

            // selected project
            project: null
        }));
    }
};

export const loadLastProject = () => {
    var lastProject = localStorage.getItem("last opened project");
    if (lastProject != null) {
        console.log(lastProject);
        selectProject(lastProject);
    }
};

export const loadLastModule = () => {
    var lastModule = localStorage.getItem("lastModule");
    if (lastModule != null) {
        let lm = JSON.parse(lastModule);
        selectModuleByNamespace(lm.namespace);
    }
};

export const openProject = (projectPath) => {
    console.log("Open Project");
    // open the selected project
    var projectsJson = localStorage.getItem("projects") || "[]";
    if (projectsJson != null) {
        var projects = JSON.parse(projectsJson);
        if (projects.indexOf(projectPath) == -1) {
            projects.push(projectPath);
            localStorage.setItem("projects", JSON.stringify(projects));

            state.update(s => ({
                ...s,
                projects
            }));
        }

        selectProject(projectPath);
    }
};

export const selectProject = projectPath => {

    localStorage.setItem("last opened project", projectPath);

    // if the app is null, we'll want to clear the stateStore.application
    // but do nothing else.
    if (!projectPath) {
        stateStore.update(s => {
            return ({
                ...s,
                project: null,
                module: null,
                application: null
            });
        });
    }
    else {
        // do something
        var path = projectPath.replace(/\//g, "__$__").replace(/\\/g, "__$__");
        post("/project/init/" + path, {});  //<-- do not await
        state.update(s => {
            return ({
                ...s,
                project: projectPath,
                module: null,
                application: null
            });
        });
    }
};

export const setDirectoryInterator = (directoryInteractor) => {
    state.update(s => {
        setTimeout(() => {
            loadLastModule();
        }, 200);

        delete directoryInteractor.namespace;
        return {
            ...s,
            ...directoryInteractor
        };
    });
};

export const setApplicationInterator = applicationInteractor => {
    state.update(s => {
        return {
            ...s,
            application: applicationInteractor
        };
    });
};



/** LOGGING AND MONITORING */

export const log = data => {


    /*
    Gets a message and appends it to the log of messages.
    Use this freely and intensively to monitor and log 
    what is happening in the application.
    */
    state.update(s => {

        var messages = s.messages || [];
        if (!data.message && data) {
            messages.unshift({
                timestamp: new Date().toLocaleString(),
                message: data
            });
            console.info(messages[0]);
        }

        return ({
            ...s,
            messages
        });
    });
};




/** KEYBOARD EVENT HANDLERS */

export const init = () => {

    eventbus.subscribe("saving", text => {
        // save the module
        saveCode(text);
    });


    eventbus.subscribe("navigateTo", async term => {
        let store = _get(state);
        if (!store.module || !store.module.namespace) return;

        let namespace = store.module.namespace;
        if (!term || !namespace) return;
        else {
            let fragment = await get("/document/find/" + namespace + "/" + term);
            eventbus.broadcast("navigate", fragment);
        }
    });


    const navigationStack = [];
    eventbus.subscribe("navigate", (fragment) => {
        let store = _get(state);
        if (!fragment) return;

        let namespace = (store && store.module) ? store.module.namespace : "__UNKNOWN";
        if (fragment.namespace !== namespace && fragment.namespace) {
            if (navigationStack.indexOf(fragment.namespace) == -1) {
                navigationStack.push(fragment.namespace);
            }
            sr_navigate("/editor/" + fragment.namespace);
            selectModuleByNamespace(fragment.namespace);
        }

        if (fragment.position) {
            setTimeout(() => {
                var pos = {
                    lineNumber: fragment.position.lineStart + 1,
                    column: fragment.position.columnStart + 1,
                };
                eventbus.broadcast("navigateToToken", pos);
            }, 500);
        }


    });

    eventbus.subscribe("back", () => {
        // not working yet...
        if (navigationStack.length > 0) {
            var store = _get(state);
            let namespace = navigationStack.pop();
            while (namespace == store.selectedModule) {
                namespace = navigationStack.pop();
            }
            if (namespace !== store.selectedModule && namespace) {
                navigate("/editor/" + namespace);
            }
        }
    });

    eventbus.subscribe("start refactor", async (term) => {
        // This is the refactoring of certain terms in our
        // application landscape. Use this function to start
        // the refactoring process.

        var store = _get(state);
        var namespace = (store.module || {}).namespace;

        console.log(term);

        if (namespace) {
            try {
                var content = await get(`/api/component/info/${namespace}/${term}`);
                if (!Array.isArray(content)) return;
                state.update(s => ({
                    ...s,
                    showRefactoringDialog: true,
                    refactoring: {
                        title: term,
                        namespace,
                        content
                    }
                }));
            }
            catch (ex) {
                // do nothing with the exception
            }
        }
    });

    eventbus.subscribe("json_schema", async term => {
        var store = _get(state);
        var namespace = (store.module || {}).namespace;

        if (namespace) {
            try {
                var body = {
                    rootNode: term,
                    namespace
                };
                var json = await post(`/json`, body);

                if (json.status && json.status !== 200) return;

                state.update(s => ({
                    ...s,
                    showJsonSchemaDialog: true,
                    schema: json.schemaText
                }));
            }
            catch (ex) {
                console.log(ex);
            }
        }
    });

    eventbus.subscribe("publish", async (module) => {
        console.log(module);
        if (!module || !module.namespace) return;

        var result = await post(`/document/publish/${module.namespace}`, {});

    });

};