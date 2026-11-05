#include "help.h"
#include <assert.h>
#include <string.h>
int main(void) {
    char url[128], small[2];
    size_t needed = cydoc_help_link(url, sizeof url, "fr", "api/c");
    assert(strcmp(url, "#/fr/api%2Fc") == 0);
    assert(needed == strlen(url) + 1);
    assert(cydoc_help_link(small, sizeof small, "fr", "api/c") == needed);
    assert(small[1] == '\0');
    return 0;
}
