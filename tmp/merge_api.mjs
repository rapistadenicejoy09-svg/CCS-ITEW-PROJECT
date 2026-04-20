import fs from 'fs';

const content = fs.readFileSync('src/lib/api.js', 'utf8');
const lines = content.split(/\r?\n/);

let head = [];
let other = [];
let postConflict = [];
let state = 0;

for (const line of lines) {
    if (line.startsWith('<<<<<<< HEAD')) { state = 1; continue; }
    if (line.startsWith('=======')) { state = 2; continue; }
    if (line.startsWith('>>>>>>>')) { state = 3; continue; }
    
    if (state === 1) head.push(line);
    else if (state === 2) other.push(line);
    else if (state === 3) postConflict.push(line);
    else if (state === 0) postConflict.push(line); // Before conflict
}

fs.writeFileSync('tmp/api_head.js', head.join('\n'));
fs.writeFileSync('tmp/api_other.js', other.join('\n'));
