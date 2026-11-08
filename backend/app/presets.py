"""Project modes and visual styles: labels for the UI, guidance for Claude.

The API validates against these ids, the web app and the MCP server read them from /presets.
"""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Preset:
    id: str
    label: str
    hint: str  # English guidance appended to Claude's input


MODES = {
    p.id: p
    for p in [
        Preset(
            "interior",
            "Interior",
            "Interior space. Restyle finishes, furniture and lighting; keep walls, openings and "
            "the camera.",
        ),
        Preset(
            "exterior",
            "Exterior / fachada",
            "Building exterior or facade. Render facade materials, glazing, sky and immediate "
            "landscaping consistent with the brief; keep massing, openings and the camera.",
        ),
        Preset(
            "paisajismo",
            "Paisajismo",
            "Landscape or garden design. Render planting, paving, water and outdoor furniture; "
            "keep the site layout, levels and the camera.",
        ),
        Preset(
            "obra",
            "Obra gris → terminado",
            "The image is a photo of an unfinished space (bare concrete, brick, exposed "
            "installations). Show it finished and furnished as the brief describes: floors, wall "
            "finishes, ceiling, lighting fixtures, furniture and decor. Keep every structural "
            "element exactly where it is: walls, columns, beams, door and window openings, "
            "ceiling height and the camera. Adding finishes and furniture is expected here.",
        ),
        Preset(
            "mejorar",
            "Mejorar render",
            "The image is already a render from Lumion, Enscape, V-Ray or similar. Do not change "
            "the design, materials or furniture: raise photorealism only (lighting, reflections, "
            "material detail, subtle imperfections, depth).",
        ),
    ]
}

STYLES = {
    p.id: p
    for p in [
        Preset("moderno", "Moderno", "Modern: clean lines, neutral palette, matte finishes, "
               "integrated lighting."),
        Preset("minimalista", "Minimalista", "Minimalist: very few objects, white and warm grey, "
               "hidden storage, soft diffuse light."),
        Preset("nordico", "Nórdico", "Scandinavian: light oak, white walls, linen and wool "
               "textiles, plants, bright soft daylight."),
        Preset("industrial", "Industrial", "Industrial: exposed concrete and brick, black steel, "
               "aged wood, Edison-style pendants."),
        Preset("tropical", "Tropical contemporáneo", "Contemporary tropical: teak and rattan, "
               "terrazzo or stone, lush indoor plants, cross ventilation, warm sun."),
        Preset("campestre", "Campestre", "Countryside: exposed timber beams, terracotta tile, "
               "rough plaster, natural fibers, warm light."),
        Preset("mediterraneo", "Mediterráneo", "Mediterranean: white lime plaster, arches, "
               "blue accents, terracotta, olive wood."),
        Preset("japandi", "Japandi", "Japandi: low furniture, pale ash and dark walnut, paper "
               "lamps, muted earth tones, calm balance."),
        Preset("lujo", "Clásico de lujo", "Classic luxury: marble, brass details, moldings, "
               "velvet upholstery, layered warm lighting."),
    ]
}


def presets_payload() -> dict[str, list[dict[str, str]]]:
    return {
        "modes": [asdict(p) for p in MODES.values()],
        "styles": [asdict(p) for p in STYLES.values()],
    }
