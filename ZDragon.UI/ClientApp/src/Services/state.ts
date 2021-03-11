import { navigate } from "svelte-routing";
import { writable } from "svelte/store";
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

export const setFiles = files => {
    navigate("/home")
    reset();
    setTimeout(() => {
        stateStore.update((s: any) => ({
            ...s,
            files
        }));
    });

}
