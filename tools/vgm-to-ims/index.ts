#!/usr/bin/env node
/**
 * VGM to IMS+BNK Converter CLI
 *
 * Usage: npm run vgm-to-ims -- <input.vgm> [options]
 *
 * Options:
 *   -o, --output <path>   Output IMS file path (default: input name with .ims)
 *   --tempo <bpm>         Base tempo (default: 120)
 *   --name <string>       Song name for IMS header
 *   -h, --help            Show help
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { convertVGMToIMS } from './converter';

function showHelp(): void {
  console.log(`
VGM to IMS+BNK Converter

Converts VGM files (YM3812/OPL2) to IMS music files and BNK instrument banks.

Usage:
  npm run vgm-to-ims -- <input.vgm> [options]
  npx tsx tools/vgm-to-ims/index.ts <input.vgm> [options]

Options:
  -o, --output <path>   Output IMS file path (default: same name as input with .ims)
  --tempo <bpm>         Base tempo in BPM (default: 120)
  --name <string>       Song name for IMS header (default: input filename)
  -h, --help            Show this help message

Examples:
  npm run vgm-to-ims -- music.vgm
  npm run vgm-to-ims -- music.vgm -o output.ims --tempo 140
  npm run vgm-to-ims -- music.vgm --name "My Song"

Output:
  Creates two files:
  - <output>.ims - IMS music file
  - <output>.bnk - BNK instrument bank file

Note:
  The BNK file is named the same as the IMS file but with .bnk extension.
  Both files should be placed together for playback.
`);
}

function main(): void {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        tempo: { type: 'string' },
        name: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });

    // Show help if requested or no input file
    if (values.help || positionals.length === 0) {
      showHelp();
      process.exit(values.help ? 0 : 1);
    }

    const inputPath = positionals[0];

    // Determine output paths
    const inputBasename = basename(inputPath).replace(/\.vgm$/i, '');
    const inputDir = dirname(inputPath);
    const outputPath = values.output || join(inputDir, `${inputBasename}.ims`);
    const bnkPath = outputPath.replace(/\.ims$/i, '.bnk');

    // Parse options
    const tempo = values.tempo ? parseInt(values.tempo, 10) : 120;
    const songName = values.name || inputBasename;

    if (isNaN(tempo) || tempo < 1 || tempo > 255) {
      console.error('Error: Tempo must be a number between 1 and 255');
      process.exit(1);
    }

    console.log(`Converting: ${inputPath}`);
    console.log(`  Tempo: ${tempo} BPM`);
    console.log(`  Song name: ${songName}`);

    // Read input file
    const vgmBuffer = readFileSync(inputPath);

    // Convert
    const result = convertVGMToIMS(vgmBuffer.buffer.slice(
      vgmBuffer.byteOffset,
      vgmBuffer.byteOffset + vgmBuffer.byteLength
    ), {
      tempo,
      songName,
    });

    // Write output files
    writeFileSync(outputPath, Buffer.from(result.ims));
    writeFileSync(bnkPath, Buffer.from(result.bnk));

    console.log('');
    console.log('Conversion complete!');
    console.log(`  IMS file: ${outputPath}`);
    console.log(`  BNK file: ${bnkPath}`);
    console.log(`  Instruments: ${result.instrumentCount}`);
    console.log(`  Events: ${result.eventCount}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main();
