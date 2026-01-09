/*
 * DOSBox logging stub for WASM build
 */

#ifndef DOSBOX_LOGGING_H
#define DOSBOX_LOGGING_H

enum LOG_TYPES {
    LOG_ALL,
    LOG_VGA, LOG_VGAGFX, LOG_VGAMISC, LOG_INT10,
    LOG_SB, LOG_DMACONTROL,
    LOG_FPU, LOG_CPU, LOG_PAGING,
    LOG_FCB, LOG_FILES, LOG_IOCTL, LOG_EXEC, LOG_DOSMISC,
    LOG_PIT, LOG_KEYBOARD, LOG_PIC,
    LOG_MOUSE, LOG_BIOS, LOG_GUI, LOG_MISC,
    LOG_IO,
    LOG_MAX
};

enum LOG_SEVERITIES {
    LOG_NORMAL,
    LOG_WARN,
    LOG_ERROR
};

struct LOG {
    LOG(LOG_TYPES, LOG_SEVERITIES) {}
    void operator()(const char*) {}
    void operator()(const char*, double) {}
    void operator()(const char*, double, double) {}
    void operator()(const char*, double, double, double) {}
    void operator()(const char*, double, double, double, double) {}
    void operator()(const char*, double, double, double, double, double) {}
    void operator()(const char*, const char*) {}
    void operator()(const char*, const char*, double) {}
    void operator()(const char*, const char*, double, double) {}
    void operator()(const char*, double, const char*) {}
    void operator()(const char*, double, double, const char*) {}
    void operator()(const char*, const char*, const char*) {}
};

#define LOG_MSG(...)

#endif
