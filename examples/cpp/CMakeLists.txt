cmake_minimum_required(VERSION 3.16)
project(cydoc_help_example LANGUAGES CXX)
add_library(cydoc_help src/help.cpp)
target_include_directories(cydoc_help PUBLIC include)
target_compile_features(cydoc_help PUBLIC cxx_std_17)
add_executable(cydoc_help_example main.cpp)
target_link_libraries(cydoc_help_example PRIVATE cydoc_help)
# modules/cydoc.help.cppm is an optional C++20 interface, kept out of this C++17 target.
