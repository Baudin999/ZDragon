
import { writable } from "svelte/store";
import { get } from "./http";

export const documentStore = writable({});

export const selectFile = async file => {
    console.log("File selected: " + file.name);

    let text = await getText(file);
    documentStore.update(s => ({ ...s, selectedFile: file, text }));
};

const getText = async (file) => {
    if (!file) return;

    var url = `/document/${file.namespace}`;
    var text = await get(url);
    return text;
};


documentStore.subscribe(async (value: any) => {
    //
});