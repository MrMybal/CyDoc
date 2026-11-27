# Dear ImGui Linux backends

These unmodified GLFW/OpenGL3 backends come from `ocornut/imgui`, commit `64944b4520b30772de8dbf0b37d0311746477a32`, matching the ImGui core revision recorded by CyUI's `third_party/imgui/VERSION.txt`. The OpenGL loader is part of that backend. See `LICENSE.txt` for the MIT terms.

Studio vendors these selected files because CyUI's source archive contains only the Win32/DX11 backends. The Linux native assistant links these to the same ImGui core supplied by CyUI; it does not introduce another core or share its context with Python. Update the backend and core revisions together.
