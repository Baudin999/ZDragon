
import { writable } from "svelte/store";
import { getText } from "./http";

export const documentStore = writable({});

export const selectFile = async file => {
    let text = await getTxt(file);
    documentStore.update(s => ({ ...s, selectedFile: file, text }));
};

const getTxt = async (file) => {
    if (!file) return;

    var url = `/document/${file.path.replace(/[\\\/]/g, "___")}`;
    var text = await getText(url);
    return text;
};


documentStore.subscribe(async (value: any) => {
    //
});