// Генерира js/site-defaults.js от lib/site.js (стойности по подразбиране за клиента).
// Пускане: node scripts/gen-defaults.js
const fs = require('fs'), path = require('path');
const { DEFAULTS } = require('../lib/site');
fs.writeFileSync(path.join(__dirname, '../js/site-defaults.js'), '/* Автоматично генериран от scripts/gen-defaults.js – не редактирай ръчно */\nwindow.VB_DEFAULTS = ' + JSON.stringify(DEFAULTS) + ';\n');
console.log('js/site-defaults.js записан');
