
import { writable } from "svelte/store";
import { documentStore } from "./file";
import { post } from "./http";

export const astStore = writable({});

export const parseCode = async (file, code) => {
    if (!file || !code) return;
    var ast = await post("/Document", { path: file.path, namespace: file.namespace, code });
    astStore.update(s => ({ ...ast, file }));
};

documentStore.subscribe((s: any) => {
    if (!s) return;
    parseCode(s.selectedFile, s.text);
});
