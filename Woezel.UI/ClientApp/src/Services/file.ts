
import { writable } from "svelte/store";
import { getText } from "./http";

export const documentStore = writable({});

export const selectFile = async file => {
    // console.log("File selected: ", file);

    let text = await getTxt(file);
    documentStore.update(s => ({ ...s, selectedFile: file, text }));
};

const getTxt = async (file) => {
    // console.log(file)
    if (!file) return;

    var url = `/document/${file.path.replace(/[\\\/]/g, "___")}`;
    var text = await getText(url);
    console.log(text);
    return text;
};


documentStore.subscribe(async (value: any) => {
    //
});