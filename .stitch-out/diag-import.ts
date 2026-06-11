import { readFileSync, writeFileSync } from 'fs';
import { htmlToSections } from '../lib/sites/html-importer';
const html = readFileSync('.stitch-out/ottawa-rendered.html','utf8');
const sections = (htmlToSections as any)(html, 'https://stitch.googleapis.com', { faithful: true });
writeFileSync('.stitch-out/diag-sections.json', JSON.stringify(sections, null, 1));
console.log('sections:', sections.length);
for (const [i,s] of sections.entries()) console.log(i, (s as any).type, JSON.stringify(s).length);
