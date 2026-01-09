# DBOPL WASM Build

DOSBox DBOPL OPL emulator compiled to WebAssembly.

## Prerequisites

Install Emscripten SDK:

```bash
# Clone emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Download and install the latest SDK
./emsdk install latest
./emsdk activate latest

# Activate PATH and other environment variables in the current terminal
source ./emsdk_env.sh
```

## Building

After setting up Emscripten, run:

```bash
cd wasm
./build.sh
```

This will generate:
- `dbopl.js` - JavaScript glue code
- `dbopl.wasm` - WebAssembly binary

## Integration

Copy the generated files to the public directory:

```bash
cp dbopl.js dbopl.wasm ../public/
```

The project will automatically use the WASM version when `dbopl.js` is loaded.

## File Structure

```
wasm/
├── dbopl.cpp          # DOSBox original DBOPL source
├── dbopl.h            # DOSBox original DBOPL header
├── dbopl_wrapper.cpp  # C API wrapper for WASM export
├── include/           # Stub headers for DOSBox dependencies
│   ├── config.h       # Type definitions
│   ├── dosbox.h       # Main header stub
│   ├── logging.h      # Logging stub
│   ├── adlib.h        # Adlib handler stub
│   └── mixer.h        # Mixer stub
├── build.sh           # Build script
└── README.md          # This file
```
