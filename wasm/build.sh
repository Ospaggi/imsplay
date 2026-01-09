#!/bin/bash

# Build DBOPL OPL emulator to WebAssembly
# Requires Emscripten SDK (emsdk)

set -e

echo "Building DBOPL to WebAssembly..."

emcc dbopl.cpp dbopl_wrapper.cpp \
  -I./include \
  -O3 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_dbopl_create","_dbopl_destroy","_dbopl_init","_dbopl_write","_dbopl_generate","_dbopl_is_opl3","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue","HEAPU8","HEAP16"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='DBOPLModule' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s NO_EXIT_RUNTIME=1 \
  -o dbopl.js

echo "Build complete!"
echo "Output files: dbopl.js, dbopl.wasm"
echo ""
echo "Copy these files to public/ directory:"
echo "  cp dbopl.js dbopl.wasm ../public/"
