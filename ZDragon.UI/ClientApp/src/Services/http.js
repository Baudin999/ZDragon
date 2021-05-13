// import { push } from "svelte-spa-router";
import { writable } from "svelte/store";

export let fetcher = writable(false);

let manageResult = (response, isText = false) => {
    // var clone = response.clone();
    return new Promise(async (resolve, reject) => {

        fetcher.set(false);

        response.then(async r => {
            var clone = r.clone();
            if (r.ok) {
                try {
                    // just simply return the text
                    if (isText) resolve(await r.text());

                    // try to parse the json result
                    return resolve(await r.json());
                } catch (err) {
                    return resolve(clone.text());
                }
            }
            else {
                reject();
            }
        }).catch(error => {
            console.log(error);
            reject();
        });
    });
};


export const post = async (url, data) => {
    fetcher.set(true);
    try {
        return await manageResult(
            fetch(url, {
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
        return await manageResult(
            fetch(url, {
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
        return await manageResult(
            fetch(url, {
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
        return await manageResult(fetch(url), false);
    } catch (err) {
        fetcher.set(false);
        console.log(err);
    }
};

export const getText = async url => {
    fetcher.set(true);
    try {
        return await manageResult(fetch(url), true);
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
