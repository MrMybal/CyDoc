module;
#include "cydoc/help.hpp"

export module cydoc.help;

export namespace cydoc_module {
inline std::string link(std::string_view base, std::string_view locale,
                        std::string_view page, std::string_view section = {}) {
    return cydoc::make_help_link(base, locale, page, section);
}
}
