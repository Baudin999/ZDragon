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

export const selectApplication = app => {

    var appJson = localStorage.getItem("applications");
    if (appJson != null) {
        var applications = (JSON.parse(appJson) as string[]).filter(a => a != app);
        applications.unshift(app);
        localStorage.setItem("applications", JSON.stringify(applications));
    }

    stateStore.update(s => ({
        ...s,
        application: app
    }));
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

