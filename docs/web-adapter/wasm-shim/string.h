#ifndef BETTERMENU_WASM_SHIM_STRING_H
#define BETTERMENU_WASM_SHIM_STRING_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

void *memcpy(void *dst, void const *src, size_t n);
void *memmove(void *dst, void const *src, size_t n);
void *memset(void *dst, int value, size_t n);
size_t strlen(char const *s);

#ifdef __cplusplus
}
#endif

#endif
