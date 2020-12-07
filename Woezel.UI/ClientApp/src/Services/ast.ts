
import { writable } from "svelte/store";
import { documentStore } from "./file";
import { post } from "./http";

export const astStore = writable({});

export const parseCode = async (file, code) => {
    if (!file || !code) return;
    var ast = await post("/Document", { path: file.path, code });
    astStore.update(s => ast);
};

documentStore.subscribe((s: any) => {
    if (!s) return;
    parseCode(s.selectedFile, s.text);
});
