/*
 * DOSBox Adlib handler stub for WASM build
 */

#ifndef DOSBOX_ADLIB_H
#define DOSBOX_ADLIB_H

#include "dosbox.h"
#include "mixer.h"

namespace Adlib {

class Handler {
public:
    virtual Bit32u WriteAddr(Bit32u port, Bit8u val) = 0;
    virtual void WriteReg(Bit32u addr, Bit8u val) = 0;
    virtual void Generate(MixerChannel* chan, Bitu samples) = 0;
    virtual void Init(Bitu rate) = 0;
    virtual ~Handler() {}
};

}

#endif
