#!/usr/bin/env node
import { buildSite } from './build.mjs';
const [command = 'help', config] = process.argv.slice(2);
if (command === 'build' || command === 'check') {
  try { await buildSite(config); } catch (error) { console.error(`CyDoc: ${error.message}`); process.exitCode = 1; }
} else {
  console.log('CyDoc\n\n  cydoc build [cydoc.config.json]\n  cydoc check [cydoc.config.json]\n\nBuilds and validates Documentation.html with local reader files in DocData/.');
  if (command !== 'help' && command !== '--help') process.exitCode = 1;
}
