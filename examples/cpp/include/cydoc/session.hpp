#pragma once
#include "cydoc/help.hpp"

namespace cydoc {
class DocSession {
public:
    virtual ~DocSession() = default;
};
class HelpSession : public DocSession {
public:
    std::string open(std::string_view page, std::string_view locale = "fr") const {
        return make_help_link("Documentation/Documentation.html", locale, page);
    }
};
}
