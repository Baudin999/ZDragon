
import { writable } from "svelte/store";
import { post } from "./http";

export const astStore = writable({});

export const parseCode = async (file, code) => {
    var ast = await post("/Document", { path: file.path, code });
    console.log(ast);
    astStore.update(s => ast);
};
