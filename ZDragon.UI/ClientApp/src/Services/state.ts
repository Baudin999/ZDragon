
import { writable } from "svelte/store";
// import { getText, get, post } from "./http";

export const stateStore = writable({});


export const toggleAddFileDialog = () => {
    stateStore.update((s: any) => ({
        ...s,
        showAddFileDialog: !!!s.showAddFileDialog
    }));
}