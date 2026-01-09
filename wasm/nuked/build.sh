#!/bin/bash

# Build Nuked-OPL3 to WebAssembly
# Requires Emscripten SDK (emsdk)

set -e

echo "Building Nuked-OPL3 to WebAssembly..."

emcc opl3.c nuked_wrapper.c \
  -O3 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_nuked_create","_nuked_destroy","_nuked_init","_nuked_write","_nuked_generate","_nuked_is_opl3","_nuked_get_sample_rate","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue","HEAPU8","HEAP16"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='NukedOPLModule' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s NO_EXIT_RUNTIME=1 \
  -o nuked-opl3.js

echo "Build complete!"
echo "Output files: nuked-opl3.js, nuked-opl3.wasm"
echo ""
echo "Copy these files to public/ directory:"
echo "  cp nuked-opl3.js nuked-opl3.wasm ../../public/"
