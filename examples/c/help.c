#include "help.h"
#include <string.h>

/**
 * @doc api-c
 * @locale fr
 * @title C · cydoc_help_link
 * @symbol cydoc_help_link
 * @section API
 * @order 180
 * Écrit un fragment de documentation dans un tampon fourni par l’appelant. Renvoie la taille requise, zéro final inclus.
 *
 * ## Signature {#signature}
 *
 * ```c
 * size_t cydoc_help_link(char *out, size_t capacity, const char *locale, const char *page);
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-c
 * @locale en
 * @title C · cydoc_help_link
 * @symbol cydoc_help_link
 * @section API
 * @order 180
 * Write a documentation fragment into a caller-owned buffer. Return the required size including the final zero.
 *
 * ## Signature {#signature}
 *
 * ```c
 * size_t cydoc_help_link(char *out, size_t capacity, const char *locale, const char *page);
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

static void append(char *out, size_t cap, size_t *n, char c) {
    if (out && cap && *n + 1 < cap) out[*n] = c;
    ++*n;
}
static void segment(char *out, size_t cap, size_t *n, const char *text) {
    const char *hex = "0123456789ABCDEF";
    for (const unsigned char *p = (const unsigned char *)text; *p; ++p) {
        unsigned char c = *p;
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
            (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') append(out,cap,n,(char)c);
        else { append(out,cap,n,'%'); append(out,cap,n,hex[c>>4]); append(out,cap,n,hex[c&15]); }
    }
}
size_t cydoc_help_link(char *out, size_t capacity, const char *locale, const char *page) {
    size_t n = 0;
    append(out,capacity,&n,'#'); append(out,capacity,&n,'/');
    segment(out,capacity,&n,locale); append(out,capacity,&n,'/'); segment(out,capacity,&n,page);
    if (out && capacity) out[n < capacity ? n : capacity-1] = '\0';
    return n + 1;
}
