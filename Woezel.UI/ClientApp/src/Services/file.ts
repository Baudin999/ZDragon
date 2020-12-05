
import { writable } from "svelte/store";
import { get } from "./http";

export const documentStore = writable({});

export const selectFile = async file => {
    // console.log("File selected: ", file);

    let text = await getText(file);
    documentStore.update(s => ({ ...s, selectedFile: file, text }));
};

const getText = async (file) => {
    // console.log(file)
    if (!file) return;

    var url = `/document/${file.path.replace(/[\\\/]/g, "___")}`;
    console.log(url)
    var text = await get(url);
    return text;
};


documentStore.subscribe(async (value: any) => {
    //
});