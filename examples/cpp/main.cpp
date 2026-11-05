#include "cydoc/help.hpp"
#include <cassert>
#include <iostream>

int main() {
    const auto url = cydoc::make_help_link("file:///D:/Help/index.html", "fr", "quickstart", "installation");
    assert(url == "file:///D:/Help/index.html#/fr/quickstart/installation");
    assert(cydoc::make_help_link("help/index.html#old", "en", "api/cpp", "two words") ==
           "help/index.html#/en/api%2Fcpp/two%20words");
    std::cout << url << '\n';
}
