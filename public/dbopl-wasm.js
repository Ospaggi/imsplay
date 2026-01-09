/*
 * DBOPL WASM Wrapper
 * Provides the same interface as alib.js but uses WebAssembly
 */

var DBOPL;
(function (DBOPL) {
    // WASM module instance (loaded asynchronously)
    let wasmModule = null;
    let modulePromise = null;

    // Buffer size for audio generation
    const BUFFER_SIZE_SAMPLES = 512;

    /**
     * Initialize the WASM module
     * @returns {Promise} Promise that resolves when module is loaded
     */
    function initWasm() {
        if (modulePromise) {
            return modulePromise;
        }

        modulePromise = DBOPLModule().then(module => {
            wasmModule = module;
            return module;
        });

        return modulePromise;
    }
    DBOPL.initWasm = initWasm;

    /**
     * Check if WASM module is loaded
     * @returns {boolean}
     */
    function isReady() {
        return wasmModule !== null;
    }
    DBOPL.isReady = isReady;

    /**
     * OPL class - compatible with alib.js interface
     */
    class OPL {
        /**
         * Create an OPL emulator instance
         * @param {number} freq - Sample rate (e.g., 44100)
         * @param {number} channels - Number of channels (1 for mono, 2 for stereo)
         */
        constructor(freq, channels) {
            if (!wasmModule) {
                throw new Error('WASM module not loaded. Call DBOPL.initWasm() first.');
            }

            this.channels = channels;
            this.freq = freq;

            // Create chip instance
            this.chip = wasmModule._dbopl_create();
            wasmModule._dbopl_init(this.chip, freq);

            // Allocate buffer in WASM memory
            // Max 512 samples * 2 channels * 2 bytes per sample
            this.bufferSize = BUFFER_SIZE_SAMPLES * 2 * 2;
            this.bufferPtr = wasmModule._malloc(this.bufferSize);

            // JavaScript buffer to return
            this.buffer = new Int16Array(BUFFER_SIZE_SAMPLES * channels);
        }

        /**
         * Write to OPL register
         * @param {number} reg - Register number
         * @param {number} val - Value to write
         */
        write(reg, val) {
            wasmModule._dbopl_write(this.chip, reg, val);
        }

        /**
         * Generate audio samples
         * @param {number} lenSamples - Number of samples to generate (max 512)
         * @returns {Int16Array} Buffer containing generated samples
         */
        generate(lenSamples) {
            if (lenSamples > 512) {
                throw new Error('OPL.generate() cannot generate more than 512 samples per call');
            }
            if (lenSamples < 2) {
                throw new Error('OPL.generate() cannot generate fewer than 2 samples per call');
            }

            // Generate samples
            wasmModule._dbopl_generate(this.chip, this.bufferPtr, lenSamples);

            // Copy from WASM memory to JavaScript buffer
            // Use HEAP16 directly - convert byte offset to int16 index
            const startIndex = this.bufferPtr >> 1;
            const wasmBuffer = wasmModule.HEAP16.subarray(
                startIndex,
                startIndex + lenSamples * this.channels
            );

            // Copy to our buffer (WASM memory can be detached on growth)
            this.buffer.set(wasmBuffer);

            return this.buffer;
        }

        /**
         * Cleanup resources
         */
        destroy() {
            if (this.chip) {
                wasmModule._dbopl_destroy(this.chip);
                this.chip = null;
            }
            if (this.bufferPtr) {
                wasmModule._free(this.bufferPtr);
                this.bufferPtr = null;
            }
        }
    }
    DBOPL.OPL = OPL;

})(DBOPL || (DBOPL = {}));
