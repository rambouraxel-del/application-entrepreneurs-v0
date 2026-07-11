// Adaptateurs transversaux V0.11. Ce premier socle applique les réglages
// globaux et préserve les anciennes interfaces publiques. Les raccordements
// métier sont complétés dans les jalons suivants.
(function () {
    'use strict';

    function badgeClass(color) {
        var allowed = ['neutral', 'info', 'warning', 'success', 'danger'];
        return 'badge-' + (allowed.indexOf(color) !== -1 ? color : 'neutral');
    }

    function applyAppearance() {
        if (!window.COCKPIT_SETTINGS) return;
        var appearance = window.COCKPIT_SETTINGS.getSection('appearance');
        var root = document.documentElement;
        root.setAttribute('data-cockpit-density', appearance.density || 'comfortable');
        root.setAttribute('data-cockpit-accent', appearance.accent || 'blue');
        root.setAttribute('data-cockpit-currency-decimals', appearance.currencyDecimals ? 'on' : 'off');
    }

    function applyCompanyCompatibility() {
        if (!window.COCKPIT_SETTINGS) return;
        var company = window.COCKPIT_SETTINGS.getSection('company');
        var legacy = window.COCKPIT_COMPANY_SETTINGS;
        if (legacy) {
            legacy.nom = company.legalName || company.tradeName;
            legacy.adresse = company.address;
            legacy.telephone = company.phone;
            legacy.email = company.email;
            legacy.siteInternet = company.website;
            legacy.siren = company.siren;
            legacy.siret = company.siret;
            legacy.tva = company.vatNumber;
            legacy.iban = company.iban;
            legacy.bic = company.bic;
            legacy.mentionsLegales = company.legalNotice;
        }
        var devisCalc = window.COCKPIT_DEVIS_CALC;
        if (devisCalc) {
            devisCalc.snapshotCompany = function () {
                var current = window.COCKPIT_SETTINGS.getSection('company');
                return {
                    nom: current.legalName || current.tradeName,
                    adresse: current.address,
                    telephone: current.phone,
                    email: current.email,
                    siret: current.siret,
                    tva: current.vatNumber,
                    iban: current.iban,
                    bic: current.bic,
                    siteInternet: current.website,
                    footerText: current.footerText,
                    signatureText: current.signatureText
                };
            };
        }
    }

    function applyProfile() {
        if (!window.COCKPIT_SETTINGS) return;
        var profile = window.COCKPIT_SETTINGS.getSection('profile');
        var demo = window.COCKPIT_SETTINGS.getSection('demo');
        var firstName = demo.enabled ? demo.firstName : profile.firstName;
        var fullName = demo.enabled ? (demo.firstName + ' ' + demo.lastName) : (profile.firstName + ' ' + profile.lastName);
        var greeting = document.getElementById('dashboard-greeting-title');
        if (greeting) greeting.textContent = 'Bonjour, ' + (firstName || 'vous') + ' !';
        var account = document.getElementById('settings-compte-detail');
        if (account) account.textContent = fullName.trim() + ' · ' + (profile.jobTitle || 'Utilisateur');
    }

    function applyLegacyLists() {
        if (!window.COCKPIT_SETTINGS) return;
        var clients = window.COCKPIT_SETTINGS.getSection('clients');
        if (window.COCKPIT_CLIENT_STATUSES) {
            window.COCKPIT_CLIENT_STATUSES.splice(0, window.COCKPIT_CLIENT_STATUSES.length);
            clients.statuses.filter(function (item) { return item.active; }).forEach(function (item) {
                window.COCKPIT_CLIENT_STATUSES.push({ value: item.id, label: item.label, badgeClass: badgeClass(item.color) });
            });
        }
    }

    function applyAll() {
        applyAppearance();
        applyCompanyCompatibility();
        applyProfile();
        applyLegacyLists();
    }

    applyAppearance();
    document.addEventListener('DOMContentLoaded', applyAll);
    window.addEventListener('load', applyAll);
    if (window.COCKPIT_SETTINGS) window.COCKPIT_SETTINGS.subscribe(applyAll);

    window.COCKPIT_SETTINGS_RUNTIME = {
        apply: applyAll,
        badgeClass: badgeClass,
        get: function (section) {
            return window.COCKPIT_SETTINGS ? window.COCKPIT_SETTINGS.getSection(section) : null;
        }
    };
})();
