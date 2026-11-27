"""Shared native appearance and validated editor preference messages."""


def preference_changes(settings, payload, theme_ids):
    if not isinstance(payload, dict):
        return {}
    changes = {}
    if payload.get('theme') in theme_ids and payload['theme'] != settings['theme']:
        changes['theme'] = payload['theme']
    if payload.get('locale') in ('en', 'fr') and payload['locale'] != settings['language']:
        changes['language'] = payload['locale']
    return changes


def apply_theme(theme, text_scale):
    import cyui as c
    from imgui_bundle import imgui as i
    c.apply('light-grey' if theme['light'] else 'navy', 'comfortable')
    palette = dict(vars(c.palette()))
    def colour(token):
        value = theme['colors'][token].lstrip('#')
        if len(value) == 3:
            value = ''.join(character*2 for character in value)
        return c.rgb(int(value,16))
    mapping = {'bg0':'sidebar','bg1':'bg','bg2':'surface','bg3':'card','bg4':'accent-bg','bg5':'line',
               'text':'text','textDim':'muted','textFaint':'faint','line':'line','lineStrong':'line',
               'grid':'line','gridStrong':'line','accent':'accent','accentHover':'accent','accentDim':'accent',
               'selection':'accent-bg','info':'accent'}
    palette.update({key:colour(token) for key,token in mapping.items()})
    palette['accentText'] = c.contrast_text(palette['accent'])
    c.set_palette(palette)
    i.get_style().frame_border_size = c.dp(1)
    i.get_style().font_scale_main = text_scale
