#include "cydoc/help.hpp"
#include <cassert>
#include <iostream>

int main() {
    const auto url = cydoc::make_help_link("file:///D:/Documentation/Documentation.html", "fr", "quickstart", "installation");
    assert(url == "file:///D:/Documentation/Documentation.html#/fr/quickstart/installation");
    assert(cydoc::make_help_link("Documentation/Documentation.html#old", "en", "api/cpp", "two words") ==
           "Documentation/Documentation.html#/en/api%2Fcpp/two%20words");
    std::cout << url << '\n';
}
