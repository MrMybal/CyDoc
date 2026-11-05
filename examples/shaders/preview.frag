#version 450
#extension GL_GOOGLE_include_directive : require
#include "common.glsl"
layout(location = 0) out vec4 fragColor;

/**
 * @doc api-glsl
 * @locale fr
 * @title GLSL · main
 * @symbol main
 * @section API
 * @order 180
 * Shader fragment. L’include nécessite un préprocesseur compatible GL_GOOGLE_include_directive ; il n’est pas du GLSL universel.
 *
 * ## Signature {#signature}
 *
 * ```glsl
 * void main()
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-glsl
 * @locale en
 * @title GLSL · main
 * @symbol main
 * @section API
 * @order 180
 * Fragment shader. The include requires a GL_GOOGLE_include_directive-compatible preprocessor; it is not universal GLSL.
 *
 * ## Signature {#signature}
 *
 * ```glsl
 * void main()
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

void main() {
    fragColor = vec4(applyExposure(vec3(0.1, 0.5, 0.3), 0.5), 1.0);
}
