import fs from 'fs';

const headStr = fs.readFileSync('tmp/api_head.js', 'utf-8');
const otherStr = fs.readFileSync('tmp/api_other.js', 'utf-8');

// 1. Get HEAD's base context (everything up to and including 'request' function)
const headLines = headStr.split('\n');
let requestEndLine = 0;
for (let i = 0; i < headLines.length; i++) {
    if (headLines[i].startsWith('export async function apiRegister')) {
        requestEndLine = i - 1;
        break;
    }
}
const baseContext = headLines.slice(0, requestEndLine).join('\n') + '\n\n';

// 2. Gather exported functions
function parseBlocks(str) {
    const blocks = [];
    const lines = str.split('\n');
    let currentBlock = [];
    let currentName = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = /^export async function ([a-zA-Z0-9_]+)/.exec(line);
        
        if (match) {
            // Push old block if any
            if (currentBlock.length > 0) {
                blocks.push({ name: currentName, content: currentBlock.join('\n') });
            }
            currentName = match[1];
            currentBlock = [line];
        } else if (line.startsWith('// ---') || line.startsWith('async function fetch') || line.startsWith('/**')) {
             if (currentBlock.length > 0) {
                blocks.push({ name: currentName, content: currentBlock.join('\n') });
            }
            currentName = null; // Free text / comments
            currentBlock = [line];
        } else {
            currentBlock.push(line);
        }
    }
    if (currentBlock.length > 0) {
        blocks.push({ name: currentName, content: currentBlock.join('\n') });
    }
    return blocks;
}

const headBlocks = parseBlocks(headLines.slice(requestEndLine).join('\n'));
const otherBlocksStr = otherStr.substring(otherStr.indexOf('export async function apiRegister'));
const otherBlocks = parseBlocks(otherBlocksStr);

const mergedBlocksMap = new Map();
const finalOrder = [];

for (const b of headBlocks) {
    mergedBlocksMap.set(b.name, b);
    finalOrder.push(b.name);
}

for (const b of otherBlocks) {
    if (b.name) {
        mergedBlocksMap.set(b.name, b);
        if (!finalOrder.includes(b.name)) {
            finalOrder.push(b.name);
        }
    } else {
        // Just insert free text
        finalOrder.push('___FREE_' + Math.random());
        mergedBlocksMap.set(finalOrder[finalOrder.length - 1], b);
    }
}

// Write the final merged string
let finalStr = baseContext;
for (const key of finalOrder) {
    const b = mergedBlocksMap.get(key);
    // Ignore mocked functions from HEAD that got overwritten
    if (b.content.includes('MOCKED FOR DEPENDENCY RESOLUTION')) {
        continue;
    }
    finalStr += b.content + '\n';
}

// Clean up MOCKED string
finalStr = finalStr.replace('// --- MISSING ENDPOINTS (MOCKED FOR DEPENDENCY RESOLUTION) ---\n', '');

fs.writeFileSync('tmp/api_final.js', finalStr.trim() + '\n');
