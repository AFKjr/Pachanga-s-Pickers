import * as fs from 'fs';
import * as path from 'path';
import strip from 'strip-comments';
import { glob } from 'glob';

const files = glob.sync(['src/**/*.{ts,tsx,js,jsx}', 'supabase/**/*.{ts,tsx,js,jsx}'], { cwd: process.cwd() });

files.forEach((file: string) => {
  const fullPath = path.resolve(file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let firstComment = '';
  let codeStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*')) {
      if (!firstComment) {
        // collect the comment block
        let j = i;
        if (line.startsWith('//')) {
          while (j < lines.length && lines[j].trim().startsWith('//')) {
            firstComment += lines[j] + '\n';
            j++;
          }
        } else if (line.startsWith('/*')) {
          while (j < lines.length && !lines[j].includes('*/')) {
            firstComment += lines[j] + '\n';
            j++;
          }
          if (j < lines.length && lines[j].includes('*/')) {
            firstComment += lines[j] + '\n';
            j++;
          }
        }
        codeStart = j;
        break;
      }
    } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
      // if non-comment non-empty line, stop
      break;
    }
  }
  const restLines = lines.slice(codeStart);
  const filteredLines = restLines.filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('/*'));
  const stripped = filteredLines.join('\n');
  const newContent = firstComment + stripped;
  fs.writeFileSync(fullPath, newContent);
});

console.log('Comments removed, keeping only top-level comments.');