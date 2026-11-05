#ifndef CYDOC_COMMON_GLSL
#define CYDOC_COMMON_GLSL
vec3 applyExposure(vec3 linearColor, float exposure) {
    return linearColor * exp2(exposure);
}
#endif
