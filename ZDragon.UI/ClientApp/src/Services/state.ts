import { navigate } from "svelte-routing";
import { writable, get } from "svelte/store";
import { post } from "./http";
import { reset } from "./module";

export const stateStore = writable({});


export const toggleAddFileDialog = () => {
    stateStore.update((s: any) => ({
        ...s,
        showAddFileDialog: !!!s.showAddFileDialog
    }));
}


export const toggleAddApplicationDialog = () => {
    stateStore.update((s: any) => ({
        ...s,
        showAddApplicationDialog: !!!s.showAddApplicationDialog
    }));
}

export const toggleRefactorDialog = () => {
    stateStore.update((s: any) => ({
        ...s,
        showRefactorDialog: !!!s.showRefactorDialog
    }));
}

export const resetApplications = () => {
    localStorage.removeItem("applications");
    stateStore.update(s => ({
        ...s,
        applications: [],
        application: null
    }));
}

export const loadApplication = application => {
    var path = application.replace(/\//g, "__$__").replace(/\\/g, "__$__");
    post("/project/init/" + path, {});  //<-- do not await
}

export const openApplication = application => {
    var appJson = localStorage.getItem("applications") || "[]";
    var applications = JSON.parse(appJson);
    if (applications.indexOf(application) == -1) {
        applications.push(application);
        localStorage.setItem("applications", JSON.stringify(applications));

        stateStore.update(s => ({
            ...s,
            applications
        }));
    }

    selectApplication(application);
}

export const selectApplication = application => {

    localStorage.setItem("last opened application", application);

    // if the app is null, we'll want to clear the stateStore.application
    // but do nothing else. 
    if (!application) {
        stateStore.update(s => ({
            ...s,
            application: null
        }));
        return;
    }
    else {

        loadApplication(application);

        stateStore.update(s => ({
            ...s,
            // applications,
            application
        }));
    }
}

export const loadApplications = () => {
    var appJson = localStorage.getItem("applications");
    if (appJson != null) {
        var applications = JSON.parse(appJson);

        stateStore.update(s => ({
            ...s,
            applications,
            application: null
        }));
    }
}

export const receiveMessage = data => {
    stateStore.update((s: any) => {

        var messages = s.messages || [];
        if (!data.message && data) {
            messages.unshift({
                timestamp: new Date().toLocaleString(),
                message: data
            });
        }
        else if (data.message) {
            messages.unshift({
                timestamp: new Date().toLocaleString(),
                message: data.message
            });
        }

        return ({
            ...s,
            messages
        });
    });
}

export const setFiles = ({ rootPath, dir }) => {
    var sts = get(stateStore);
    if (rootPath != sts.application) {
        navigate("/home");
        reset();
    }
    setTimeout(() => {
        stateStore.update((s: any) => ({
            ...s,
            files: dir
        }));
    });
}

