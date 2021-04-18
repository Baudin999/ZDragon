// import { push } from "svelte-spa-router";
import { writable } from "svelte/store";

export let fetcher = writable(false);

let manageResult = async (response, isText = false) => {
    fetcher.set(false);
    var clone = response.clone();
    if (response.status === 401) {
        //push("/login");
    }

    console.log(response.status);

    try {
        // just simply return the text
        if (isText) return await response.text();

        // try to parse the json result
        return await response.json();
    } catch (err) {
        return clone.text();
    }
};


export const post = async (url, data) => {
    fetcher.set(true);
    try {
        return manageResult(
            await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: data ? JSON.stringify(data) : null
            })
        );
    } catch (err) {
        fetcher.set(false);
        console.log("ERROR:");
        console.log(err);
    }
};

export const put = async (url, data, stringify = true) => {
    fetcher.set(true);
    try {
        return manageResult(
            await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: stringify ? JSON.stringify(data) : data
            })
        );
    } catch (err) {
        fetcher.set(false);
        console.log("ERROR:");
        console.log(err);
    }
};

export const del = async (url, data) => {
    fetcher.set(true);
    try {
        return manageResult(
            await fetch(url, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: data ? JSON.stringify(data) : null
            })
        );
    } catch (err) {
        fetcher.set(false);
        console.log("ERROR:");
        console.log(err);
    }
};

export const get = async url => {
    fetcher.set(true);
    try {
        return manageResult(await fetch(url));
    } catch (err) {
        fetcher.set(false);
        console.log(err);
    }
};

export const getText = async url => {
    fetcher.set(true);
    try {
        return manageResult(await fetch(url), true);
    } catch (err) {
        fetcher.set(false);
        console.log(err);
    }
};

export const ckFetch = {
    post,
    put,
    del,
    get
};
