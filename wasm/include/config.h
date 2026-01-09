/*
 * DOSBox type definitions stub for WASM build
 */

#ifndef CONFIG_H
#define CONFIG_H

typedef unsigned char  Bit8u;
typedef signed char    Bit8s;
typedef unsigned short Bit16u;
typedef signed short   Bit16s;
typedef unsigned int   Bit32u;
typedef signed int     Bit32s;
typedef unsigned int   Bitu;
typedef signed int     Bits;

#define INLINE inline
#define DB_FASTCALL
#define GCC_UNLIKELY(x) (x)
#define GCC_LIKELY(x) (x)
#define GCC_ATTRIBUTE(x)

#endif
