/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Password Hasher Plus
 *
 * The Initial Developer of the Original Code is Eric Woodruff.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): (none)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var debug = true;
var maskKey;
var showMaskButton;

var id = 0;

var fields = new Array ();
var extract_number = new RegExp ("^([0-9]+)px$");

function getStyles(field, styles) {
    var fieldStyles = getComputedStyle(field, null);
    var results = {};
    for (let prop of styles) {
        var r = extract_number.exec(fieldStyles[prop]);
        if (r == null) {
            results[prop] = fieldStyles[prop];
        } else {
            results[prop] = Number(r[1]);
        }
    }
    return results;
}

function createMaskButton(field, innerHTML) {
    if (debug) console.log("creating mask button for field " + field.id);
    /* create unmask button */
    var maskbutton = document.createElement('div');
    maskbutton.classList.add('passhashplusbutton');
    maskbutton.innerHTML = innerHTML;
    /* position at the bottom right corner of password field */
    var fs = getStyles(field, [ 'display' ]);
    if (fs.display == 'none') {
        // shortcircuit when field is display:none
        return maskbutton;
    }
    field.parentNode.insertBefore(maskbutton, field);
    var fieldRect = field.getBoundingClientRect();
    var top = Math.max(fieldRect.height + maskbutton.clientHeight, 0) + 5;
    var left = Math.max(fieldRect.width - maskbutton.clientWidth, 0) - 5;
    if (debug) console.log('maskbutton.top = ' + top + 'px, maskbutton.left = ' + left + 'px');
    maskbutton.style['top'] = `${top}px`;
    maskbutton.style['left'] = `${left}px`;
    return maskbutton;
}

function bind (f) {
    var field = f;
    /* make sure each field we care about has an id */
    if ("" == field.id) {
        field.id = "passhash_" + id++;
    }

    if (-1 != fields.indexOf(field) || field.classList.contains("nopasshash")) {
        return false;
    }
    fields[fields.length] = field;

    var masking = true;

    var maskbutton = null;
    if (showMaskButton) {
        // Only create button when `showMaskButton` is true
        maskbutton = createMaskButton(field, field.type === 'password' ? 'a' : '*');
    }

    /* toggle masking... maybe remove here? */
    function setFieldType () {
        if (masking) {
            field.type = "password";
            if (null != maskbutton) {
                maskbutton.innerHTML = "a";
                maskbutton.title = "Show password (Ctrl + *)";
            }
        } else {
            field.type = "text";
            if (null != maskbutton) {
                maskbutton.innerHTML = "*";
                maskbutton.title = "Mask password (Ctrl + *)";
            }
        }
    }
    function toggleMasking () {
        masking = !masking;
        setFieldType ();
    }

    /* make button do something */
    if (maskbutton != null) {
        maskbutton.addEventListener('click', toggleMasking);
    }
    /* bind shortcut also */
    field.addEventListener('keydown', function (e) {
        var shortcut = (e.ctrlKey ? "Ctrl+" : "") + (e.shiftKey ? "Shift+" : "") + e.which;
        if (shortcut == maskKey)
            toggleMasking ();
    });

    setFieldType ();
    return true;
}

// Initialize all password fields
function initAllFields() {
    var pwfields = document.querySelectorAll("input[type=password]");
    for (let field of pwfields) {
        bind(field);
    }
}

// Make sure we react to dynamically appearing elements
function onMutation (mutations, observer) {
    mutations.forEach (function(mutation) {
        for (var i = 0; i < mutation.addedNodes.length; ++i) {
            var item = mutation.addedNodes[i];
            if (item.nodeName == 'INPUT' && item.type == 'password') {
                bind(item);
            } else {
                requestAnimationFrame(initAllFields);
            }
        }
    });
}
var observer = new MutationObserver (onMutation);

// Grab options from storage
browser.storage.local.get('sync').then(results => {
    var area = results.sync ? browser.storage.sync : browser.storage.local;
    area.get('options').then(optres => {
        maskKey = optres.options.maskKey;
        showMaskButton = optres.options.showMaskButton;
        if (debug) console.log("Got settings: maskKey="+maskKey+", showMaskButton="+showMaskButton);
        // run on initial page content after we've gotten settings
        requestAnimationFrame(initAllFields);
        // only start observing document for changes when we've gotten
        // settings from storage
        observer.observe (document, { childList: true, subtree: true });
    });
});
// Register for storage changes to update maskkey when necessary
browser.storage.onChanged.addListener(function (changes, areaName) {
    if ('options' in changes) {
        maskKey = changes.options.newValue.maskKey;
        if (showMaskButton !== changes.options.newValue.showMaskButton) {
            showMaskButton = changes.options.newValue.showMaskButton;
            if (debug) console.log("[passwordhasherplus] showMaskButton changed: " + showMaskButton);
            requestAnimationFrame(initAllFields);
        }
        if (maskKey !== changes.options.oldValue.maskKey) {
            if (debug) console.log("[passwordhasherplus] mask key changed from " + changes.options.oldValue.maskKey + " to " + maskKey);
        }
    }
});
