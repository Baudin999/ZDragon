
import { writable } from "svelte/store";

export const selections = writable({});

export const selectWord = (word) => {
    selections.update(store => ({
        ...store,
        word
    }));
}