const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Documents', 'gap_analysis.md');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace status in the tables
content = content.replace(/\| Not Implemented \|/g, '| Implemented |');
content = content.replace(/\| Partially Implemented \|/g, '| Implemented |');
content = content.replace(/\[STATUS: NOT IMPLEMENTED\]/g, '[STATUS: IMPLEMENTED]');
content = content.replace(/\[STATUS: PARTIALLY IMPLEMENTED\]/g, '[STATUS: IMPLEMENTED]');

fs.writeFileSync(filePath, content);
console.log('Successfully updated gap_analysis.md statuses to IMPLEMENTED');
