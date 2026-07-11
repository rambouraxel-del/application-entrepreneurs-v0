const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const html = read('pages/settings.html');
const ui = read('js/settings-ui.js');
const css = read('css/settings.css');
const defaults = read('js/settings-defaults.js');
const consumers = read('js/settings-consumers.js');

assert(html.includes('settings-back-link'), 'Le retour discret doit remplacer le gros bouton');
assert((html.match(/<svg/g) || []).length >= 8, 'La barre latérale doit réutiliser les icônes SVG');
assert(!html.includes('sidebar-icon">⌂') && !html.includes('sidebar-icon">◎'), 'Les anciennes icônes texte ne doivent plus être utilisées');
assert(html.includes('Maintenance de l’application'), 'La rubrique technique doit être renommée clairement');

assert(!ui.includes('Préparatoire V1'), 'Les mentions préparatoires V1 ne doivent plus être exposées');
assert(!ui.includes("m.status==='v1'?' disabled'"), 'Les champs préparatoires ne doivent plus être désactivés');
assert(ui.includes("['fr', 'Français'], ['en', 'Anglais'], ['nl', 'Néerlandais']"), 'Les trois langues demandées doivent être proposées');
assert(ui.includes("['monday', 'Lundi']") && ui.includes("['sunday', 'Dimanche']"), 'Les jours doivent être proposés en français');
assert(ui.includes('settings-color-picker') && ui.includes('settings-badge-preview'), 'Les styles de badge doivent être visuels');
assert(ui.includes('data-reference-rename') && ui.includes('data-reference-delete'), 'Chaque référence doit pouvoir être renommée et supprimée');
assert(ui.includes('data-string-rename') && ui.includes('data-string-delete'), 'Chaque option de liste doit pouvoir être renommée et supprimée');
assert(ui.includes("if (sec === 'clients' && path === 'customFields') return ''"), 'Les champs personnalisés Clients doivent être masqués');
assert(ui.includes('Vider le cache') && ui.includes('Réinitialiser les préférences d’affichage'), 'La maintenance doit contenir les deux actions retenues');
assert(!ui.includes('Exporter JSON') && !ui.includes('Choisir un fichier') && !ui.includes('Mot de passe / 2FA'), 'Les fonctions techniques doivent être retirées');
assert(ui.includes("function security() {\n        out.innerHTML = '';\n    }"), 'Compte et sécurité doit rester vide');
assert(ui.includes('syncGlobalPageSize'), 'La taille de liste globale doit être propagée aux modules');

assert(!defaults.includes('customFields:'), 'Le champ personnalisé Clients doit être supprimé du schéma');
assert(css.includes('.settings-color-choice') && css.includes('.settings-action-danger'), 'Les nouveaux contrôles visuels doivent être stylés');
assert(consumers.includes("setSelect('clients-page-size',String(pageSizeFor('clients-page-size')),true)"), 'La pagination Clients doit être appliquée et déclencher le recalcul de la liste');
assert(consumers.includes("setSelect('products-page-size',String(pageSizeFor('products-page-size')),true)"), 'La pagination Produits doit être appliquée et déclencher le recalcul de la liste');

console.log('V0.11.1 settings corrective checks: OK');
