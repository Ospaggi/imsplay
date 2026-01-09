/*
 * Nuked-OPL3 WASM Wrapper
 * Provides C interface for WebAssembly export
 */

#include <stdlib.h>
#include <string.h>
#include "opl3.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

// Create a new OPL3 chip instance
EXPORT void* nuked_create(void) {
    opl3_chip* chip = (opl3_chip*)malloc(sizeof(opl3_chip));
    if (chip) {
        memset(chip, 0, sizeof(opl3_chip));
    }
    return chip;
}

// Destroy an OPL3 chip instance
EXPORT void nuked_destroy(void* chip) {
    if (chip) {
        free(chip);
    }
}

// OPL3 native sample rate
#define OPL3_SAMPLE_RATE 49716

// Initialize the OPL3 chip (always uses native 49716Hz internally)
EXPORT void nuked_init(void* chip, unsigned int samplerate) {
    opl3_chip* c = (opl3_chip*)chip;
    // Always use native sample rate to avoid resampling timing issues
    OPL3_Reset(c, OPL3_SAMPLE_RATE);
    (void)samplerate; // unused - we always use native rate
}

// Write to OPL3 register (buffered for proper timing)
// For OPL2 compatibility: reg 0x00-0xFF maps to first register set
// For OPL3: reg 0x100-0x1FF maps to second register set
EXPORT void nuked_write(void* chip, unsigned int reg, unsigned char val) {
    OPL3_WriteRegBuffered((opl3_chip*)chip, (uint16_t)reg, val);
}

// Volume amplification (0 = no amplification)
#define VOL_AMP 0

static inline int16_t clip_sample(int32_t v) {
    if (v > 32767) return 32767;
    if (v < -32768) return -32768;
    return (int16_t)v;
}

// Generate audio samples at native 49716Hz rate (no resampling)
// Output is 16-bit signed stereo samples (interleaved L/R)
// Uses OPL3_GenerateStream for proper timing with buffered writes
EXPORT void nuked_generate(void* chip, short* buffer, unsigned int samples) {
    opl3_chip* c = (opl3_chip*)chip;

    // OPL3_GenerateStream handles buffered writes timing correctly
    OPL3_GenerateStream(c, buffer, samples);

    // Apply volume amplification
    for (unsigned int i = 0; i < samples * 2; i++) {
        int32_t v = (int32_t)buffer[i] << VOL_AMP;
        buffer[i] = clip_sample(v);
    }
}

// Get native sample rate
EXPORT unsigned int nuked_get_sample_rate(void) {
    return OPL3_SAMPLE_RATE;
}

// Check if OPL3 mode is enabled
EXPORT int nuked_is_opl3(void* chip) {
    return ((opl3_chip*)chip)->newm;
}
