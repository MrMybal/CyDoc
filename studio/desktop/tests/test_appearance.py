"""Native ImGui context/style checks. No platform backend or window is created."""
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from appearance import preference_changes, apply_theme


def test_editor_language_preferences_update_the_native_shell_without_a_theme_change():
    settings={'language':'en','theme':'light','privateSetting':'retained'}
    assert preference_changes(settings,{'locale':'fr'},['light','dark'])=={'language':'fr'}
    assert preference_changes(settings,{'locale':'de','theme':'unknown','privateSetting':'changed'},['light','dark'])=={}
    assert preference_changes(settings,{'locale':'fr','theme':'dark'},['light','dark'])=={'language':'fr','theme':'dark'}
    assert preference_changes(settings,None,['light','dark'])=={}
    assert settings=={'language':'en','theme':'light','privateSetting':'retained'}


def test_native_theme_text_contrast_and_control_metrics_without_a_window():
    from imgui_bundle import imgui as i
    context=i.create_context()
    def luminance(colour):
        values=[colour.x,colour.y,colour.z]
        return sum((value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4)*weight for value,weight in zip(values,[.2126,.7152,.0722]))
    def contrast(a,b):
        a,b=luminance(a),luminance(b)
        return (max(a,b)+.05)/(min(a,b)+.05)
    try:
        catalog=json.loads((Path(__file__).resolve().parents[2]/'dist/themes.json').read_text('utf-8'))
        for theme in catalog:
            apply_theme(theme,1.0);style=i.get_style()
            assert style.font_size_base>=16
            assert style.frame_border_size>=1
            assert style.font_size_base+2*style.frame_padding.y>=24
            assert contrast(style.color_(i.Col_.text),style.color_(i.Col_.frame_bg))>=4.5,theme['id']
            border,background=style.color_(i.Col_.border),style.color_(i.Col_.frame_bg)
            assert (border.x,border.y,border.z)!=(background.x,background.y,background.z),theme['id']
    finally:i.destroy_context(context)
