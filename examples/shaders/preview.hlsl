#include "common.hlsli"

/**
 * @doc api-hlsl
 * @locale fr
 * @title HLSL · MainPS
 * @symbol MainPS
 * @section API
 * @order 180
 * Shader de démonstration. Le lien include mène au fichier commun.hlsli de l’index de sources.
 *
 * ## Signature {#signature}
 *
 * ```hlsl
 * float4 MainPS(float4 position : SV_Position) : SV_Target
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-hlsl
 * @locale en
 * @title HLSL · MainPS
 * @symbol MainPS
 * @section API
 * @order 180
 * Demo shader. The include link leads to common.hlsli in the source index.
 *
 * ## Signature {#signature}
 *
 * ```hlsl
 * float4 MainPS(float4 position : SV_Position) : SV_Target
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

float4 MainPS(float4 position : SV_Position) : SV_Target {
    float3 color = ApplyExposure(float3(0.1, 0.5, 0.3), 0.5);
    return float4(color, 1.0);
}
