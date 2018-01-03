import {join} from 'path';
import * as fs from 'fs-extra';
import {DOMParser, XMLSerializer} from 'xmldom';
import xmlBufferToString from 'xml-buffer-tostring';
import program from 'commander';
import {version} from '../package.json';

import anonymize from '../index.js';

const {readdir, readFile, writeFile} = fs;

program
  .version(version)
  .usage('--in <dossier> --out <dossier>')
  .option('-i, --in <dir>', 'Input directory')
  .option('-o, --out <dir>', 'Output directory')
  .parse(process.argv);

const {in:inDir, out:outDir} = program;

if (!inDir || !outDir) {
   console.error('Error: Input and Output directories are mandatory.');
   program.help();
}

readdir(inDir)
.then(files => {
    console.log('files', files);

    return Promise.all(files.map(f => {
        return readFile(join(inDir, f))
        .then( xmlBufferToString )
        .then( str => {
            return (new DOMParser()).parseFromString(str, "text/xml");
        })
        .then(doc => {
            anonymize(doc);

            // convert to utf-8
            Array.from(doc.childNodes).forEach(n => {
                if(n.nodeType === 7 && n.target === 'xml'){ // PROCESSING_INSTRUCTION_NODE
                    n.data = n.data.replace(/encoding="(.*)"/, 'encoding="UTF-8"');
                }
            });

            return doc;
        })
        .then( doc => {
            return (new XMLSerializer()).serializeToString(doc);
        })
        .then(str => writeFile(join(outDir, f), str, 'utf-8'));
    }));
})
.catch(err => {
    console.error('error', err);
    process.exit(1);
});