const fs = require('fs');
const path = require('path');
let s = fs.readFileSync(path.join(__dirname, '../server/prisma/schema.prisma'), 'utf8');
s = s.replace('provider = "postgresql"', 'provider = "sqlite"');
s = s.replace(/String\[\]\s*@default\(\[\]\)/g, 'String @default("[]")');
s = s.replace(/String\[\]/g, 'String');
// SQLite does not support Json type — convert to String
s = s.replace(/Json\s+@default\("(\{[^"]*\}|\[[^\]]*\])"\)/g, 'String @default("$1")');
s = s.replace(/Json\?/g, 'String?');
s = s.replace(/\bJson\b/g, 'String');
fs.writeFileSync(path.join(__dirname, '../server/prisma/schema.dev.prisma'), s);
console.log('schema.dev.prisma created');
