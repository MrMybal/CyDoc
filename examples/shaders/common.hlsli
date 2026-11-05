#ifndef CYDOC_COMMON_HLSLI
#define CYDOC_COMMON_HLSLI
float3 ApplyExposure(float3 linearColor, float exposure) {
    return linearColor * exp2(exposure);
}
#endif
