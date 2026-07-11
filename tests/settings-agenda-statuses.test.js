'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function makeContext(storage) {
    const events = {};
    const localStorage = {
        getItem: (key) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
        setItem: (key, value) => { storage[key] = String(value); },
        removeItem: (key) => { delete storage[key]; },
        clear: () => Object.keys(storage).forEach((key) => delete storage[key])
    };
    const document = {
        readyState: 'loading',
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: (type, fn) => { (events[type] || (events[type] = [])).push(fn); }
    };
    const window = {
        document,
        localStorage,
        console,
        CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
        dispatchEvent() {},
        addEventListener(type, fn) { (events['window:' + type] || (events['window:' + type] = [])).push(fn); }
    };
    const context = {
        window, document, localStorage, console, CustomEvent: window.CustomEvent,
        Date, JSON, Number, String, Boolean, Array, Object, Math, Intl,
        setTimeout, clearTimeout
    };
    vm.createContext(context);
    return context;
}

function load(context, file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file });
}

const storage = {};
let context = makeContext(storage);
load(context, 'settings-defaults.js');

const legacy = JSON.parse(JSON.stringify(context.window.COCKPIT_SETTINGS_DEFAULTS));
legacy.agenda.initialStatus = 'cancelled';
legacy.agenda.statuses = legacy.agenda.statuses.slice(0, 4).concat([{
    id: 'cancelled', legacyId: 'sans-suite', label: 'Sans suite personnalisée',
    color: 'warning', active: false, order: 5
}]);
storage['cockpit.settings.v1'] = JSON.stringify(legacy);

context = makeContext(storage);
load(context, 'settings-defaults.js');
load(context, 'settings-store.js');

const store = context.window.COCKPIT_SETTINGS;
let agenda = store.getSection('agenda');
const legacyValues = agenda.statuses.map((item) => item.legacyId || item.id);
assert.deepStrictEqual(Array.from(legacyValues), ['prevu', 'confirme', 'reporte', 'realise', 'annule', 'sans_suite']);
assert.strictEqual(agenda.initialStatus, 'no-follow-up', 'l’ancien statut initial cancelled désignait Sans suite');
assert(!agenda.statuses.some((item) => item.legacyId === 'sans-suite'), 'l’alias avec tiret doit disparaître');

const cancelled = agenda.statuses.find((item) => item.legacyId === 'annule');
const noFollowUp = agenda.statuses.find((item) => item.legacyId === 'sans_suite');
assert(cancelled, 'Annulé doit être ajouté lors de la migration');
assert(noFollowUp, 'Sans suite doit être conservé lors de la migration');
assert.strictEqual(noFollowUp.label, 'Sans suite personnalisée');
assert.strictEqual(noFollowUp.color, 'warning');
assert.strictEqual(noFollowUp.active, false);

cancelled.label = 'Annulation client';
cancelled.color = 'danger';
cancelled.active = false;
noFollowUp.label = 'Dossier clos';
noFollowUp.color = 'neutral';
noFollowUp.active = true;
store.updateSection('agenda', agenda);

context.window.COCKPIT_RDV_DETAILS = {
    cancelled: { statut: 'annule' },
    closed: { statut: 'sans_suite' }
};
load(context, 'settings-referentials.js');
context.window.COCKPIT_RDV_STATUSES = [];

const runtimeStatuses = context.window.COCKPIT_RDV_STATUSES;
assert.strictEqual(runtimeStatuses.filter((item) => item.value === 'annule').length, 1, 'Annulé sans doublon');
assert.strictEqual(runtimeStatuses.filter((item) => item.value === 'sans_suite').length, 1, 'Sans suite sans doublon');
assert(runtimeStatuses.find((item) => item.value === 'annule').label.startsWith('Annulation client'));
assert.strictEqual(runtimeStatuses.find((item) => item.value === 'annule').badgeClass, 'badge-danger');
assert.strictEqual(runtimeStatuses.find((item) => item.value === 'sans_suite').label, 'Dossier clos');
assert.strictEqual(runtimeStatuses.find((item) => item.value === 'sans_suite').badgeClass, 'badge-neutral');

console.log('settings-agenda-statuses.test.js: OK');
