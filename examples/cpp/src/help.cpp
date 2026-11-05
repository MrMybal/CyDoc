#include "cydoc/help.hpp"

namespace cydoc {
namespace {
std::string encode(std::string_view value) {
    constexpr char hex[] = "0123456789ABCDEF";
    std::string result;
    for (unsigned char c : value) {
        const bool safe = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                          (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~';
        if (safe) result += static_cast<char>(c);
        else { result += '%'; result += hex[c >> 4]; result += hex[c & 15]; }
    }
    return result;
}
}
std::string make_help_link(std::string_view base, std::string_view locale,
                           std::string_view page, std::string_view section) {
    std::string result(base.substr(0, base.find('#')));
    result += "#/" + encode(locale) + "/" + encode(page);
    if (!section.empty()) result += "/" + encode(section);
    return result;
}
}
