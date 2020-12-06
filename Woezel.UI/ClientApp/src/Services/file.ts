
import { writable } from "svelte/store";
import { getText } from "./http";

export const documentStore = writable({});

export const selectFile = async file => {
    let text = await getTxt(file);
    documentStore.update(s => ({ ...s, selectedFile: file, text }));
};

const getTxt = async (file) => {
    if (!file) return;

    var encodedURI = encodeURI(file.path);
    var url = `/document/${encodedURI}`;
    var text = await getText(url);
    return text;
};


documentStore.subscribe(async (value: any) => {
    //
});