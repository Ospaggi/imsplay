/*
 * C API wrapper for DOSBox DBOPL OPL emulator
 * For use with Emscripten/WASM
 */

#include "dbopl.h"

// Global table initialization flag
static bool tablesInitialized = false;

// Forward declaration of InitTables from dbopl.cpp
namespace DBOPL {
    void InitTables();
}

extern "C" {

// Create a new DBOPL chip instance
void* dbopl_create() {
    return new DBOPL::Chip();
}

// Destroy a DBOPL chip instance
void dbopl_destroy(void* chip) {
    delete static_cast<DBOPL::Chip*>(chip);
}

// Initialize the chip with sample rate
void dbopl_init(void* chip, unsigned int rate) {
    if (!tablesInitialized) {
        DBOPL::InitTables();
        tablesInitialized = true;
    }
    static_cast<DBOPL::Chip*>(chip)->Setup(rate);
}

// Write to OPL register
void dbopl_write(void* chip, unsigned int reg, unsigned char val) {
    static_cast<DBOPL::Chip*>(chip)->WriteReg(reg, val);
}

// Volume amplification (matches alib.js VOL_AMP = 1, which is 2x)
#define VOL_AMP 1

// Clamp sample to 16-bit range
static inline Bit32s clipSample(Bit32s v) {
    if (v > 32767) return 32767;
    if (v < -32768) return -32768;
    return v;
}

// Generate audio samples
// Output is 16-bit signed stereo samples (OPL2 mono is duplicated to stereo)
void dbopl_generate(void* chip, short* buffer, unsigned int samples) {
    DBOPL::Chip* c = static_cast<DBOPL::Chip*>(chip);

    // DBOPL generates Bit32s samples, we need to convert to Bit16s
    Bit32s tempBuffer[512 * 2];

    unsigned int remaining = samples;
    short* outPtr = buffer;

    while (remaining > 0) {
        unsigned int toGenerate = remaining > 512 ? 512 : remaining;

        if (!c->opl3Active) {
            // OPL2 mode - mono output, duplicate to stereo
            c->GenerateBlock2(toGenerate, tempBuffer);

            for (unsigned int i = 0; i < toGenerate; i++) {
                // Apply volume amplification and clip
                Bit32s sample = clipSample(tempBuffer[i] << VOL_AMP);
                // Duplicate mono to stereo (L and R)
                *outPtr++ = static_cast<short>(sample);
                *outPtr++ = static_cast<short>(sample);
            }
        } else {
            // OPL3 mode - stereo output
            c->GenerateBlock3(toGenerate, tempBuffer);

            for (unsigned int i = 0; i < toGenerate; i++) {
                // Left channel
                Bit32s sampleL = clipSample(tempBuffer[i * 2] << VOL_AMP);
                *outPtr++ = static_cast<short>(sampleL);
                // Right channel
                Bit32s sampleR = clipSample(tempBuffer[i * 2 + 1] << VOL_AMP);
                *outPtr++ = static_cast<short>(sampleR);
            }
        }

        remaining -= toGenerate;
    }
}

// Check if OPL3 mode is active
int dbopl_is_opl3(void* chip) {
    return static_cast<DBOPL::Chip*>(chip)->opl3Active ? 1 : 0;
}

}
