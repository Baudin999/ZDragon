
import { writable } from "svelte/store";
import { get } from "./http";

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

export const getFiles = async () => {
    let files = await get("/domains");
    // console.log(files);
    stateStore.update((s: any) => ({
        ...s,
        files
    }));
}