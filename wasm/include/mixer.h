/*
 * DOSBox MixerChannel stub for WASM build
 */

#ifndef DOSBOX_MIXER_H
#define DOSBOX_MIXER_H

#ifndef DOSBOX_DOSBOX_H
#include "dosbox.h"
#endif

class MixerChannel {
public:
    void AddSamples_m32(Bitu len, const Bit32s* data) {}
    void AddSamples_s32(Bitu len, const Bit32s* data) {}
};

#endif
