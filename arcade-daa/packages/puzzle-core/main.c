#include <emscripten.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stdarg.h>
#include "puzzles.h"

extern const game thegame;

// ============================================================================
// FRONTEND STUBS (Required by SGT Puzzles Engine)
// ============================================================================

// The engine calls this if it runs out of memory or hits an impossible state
void fatal(const char *fmt, ...) {
    va_list ap;
    fprintf(stderr, "FATAL ERROR: ");
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fprintf(stderr, "\n");
    exit(1); 
}

// The engine calls this to know what color to draw the background.
// Since we are drawing everything in Next.js, we just return dummy values.
void frontend_default_colour(frontend *fe, float *output) {
    output[0] = 0.0f; // R
    output[1] = 0.0f; // G
    output[2] = 0.0f; // B
}

// ============================================================================
// WASM BRIDGE
// ============================================================================

EMSCRIPTEN_KEEPALIVE
int check_version() {
    return 2026;
}

EMSCRIPTEN_KEEPALIVE
const char* generate_level(int width, int height, const char* seed) {
    char param_str[64];
    sprintf(param_str, "%dx%d", width, height);
    
    game_params *params = thegame.default_params();
    thegame.decode_params(params, param_str);
    
    random_state *rs = random_new((char*)seed, strlen(seed));
    
    char *desc, *aux;
    desc = thegame.new_desc(params, rs, &aux, false);
    
    static char buffer[1024];
    sprintf(buffer, "%s:%s", param_str, desc); 
    
    sfree(desc);
    if (aux) sfree(aux);
    random_free(rs);
    thegame.free_params(params);
    
    return buffer;
}