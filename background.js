/*
 * We fire change and keyup events after we edit the value of the currently
 * focused password field to catch the most common ways to do client-side
 * password verification.
 */
function updateFocusedField(tabid, hash) {
    browser.tabs.executeScript(tabid, {
        code: `
document.activeElement.value = '${hash}';
var evt = new Event('change');
setTimeout(document.activeElement.dispatchEvent(evt), 0);
evt = new Event('keyup');
setTimeout(document.activeElement.dispatchEvent(evt), 0);`
    });
}

function forwardHash(tag, hash) {
    if (debug) console.log("[background.js:forwardHash] got hash " + hash + " for page " + tag);
    browser.tabs.query({active:true,currentWindow:true}).then(results => {
        var tab = results[0];
        updateFocusedField(tab.id, hash);
    });
}

/* enable page action for all regular tabs */
browser.tabs.query({}).then(opentabs => {
    for (let tab of opentabs) {
        browser.pageAction.show(tab.id);
    }
});

/* enable page action for new tabs */
browser.tabs.onUpdated.addListener((tabid,changeinfo) => {
    browser.pageAction.show(tabid);
});

/* create context menu item for all editable fields */
browser.menus.create({
    id: 'open-passhash',
    title: 'Password Hasher Plus',
    /* TODO: figure out icons */
    icons: {
        "16": "images/passhash.png",
        "32": "images/passhash.png"
    },
    contexts: ["editable", "password"],
    command: "_execute_page_action",
});
