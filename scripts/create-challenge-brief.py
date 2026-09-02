from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_PATH = OUTPUT_DIR / "Entangle_2K26_Challenge_Task.pdf"
LOGO_PATH = ROOT / "public" / "logo.png"

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#21190F")
CREAM = colors.HexColor("#F4E9D3")
PAPER = colors.HexColor("#FFF8EA")
MUSTARD = colors.HexColor("#F4B638")
TOMATO = colors.HexColor("#ED512D")
OLIVE = colors.HexColor("#718044")
MUTED = colors.HexColor("#665A4C")
WHITE = colors.white


def register_fonts():
    regular = Path(r"C:\Windows\Fonts\arial.ttf")
    bold = Path(r"C:\Windows\Fonts\arialbd.ttf")
    mono = Path(r"C:\Windows\Fonts\consola.ttf")
    mono_bold = Path(r"C:\Windows\Fonts\consolab.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("EntangleSans", str(regular)))
        pdfmetrics.registerFont(TTFont("EntangleSansBold", str(bold)))
    if mono.exists() and mono_bold.exists():
        pdfmetrics.registerFont(TTFont("EntangleMono", str(mono)))
        pdfmetrics.registerFont(TTFont("EntangleMonoBold", str(mono_bold)))


register_fonts()
SANS = "EntangleSans" if "EntangleSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
SANS_BOLD = "EntangleSansBold" if "EntangleSansBold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"
MONO = "EntangleMono" if "EntangleMono" in pdfmetrics.getRegisteredFontNames() else "Courier"
MONO_BOLD = "EntangleMonoBold" if "EntangleMonoBold" in pdfmetrics.getRegisteredFontNames() else "Courier-Bold"


styles = getSampleStyleSheet()
ST = {
    "eyebrow": ParagraphStyle(
        "Eyebrow", parent=styles["Normal"], fontName=MONO_BOLD, fontSize=8.5,
        leading=11, textColor=TOMATO, spaceAfter=6, tracking=0.8,
    ),
    "title": ParagraphStyle(
        "Title", parent=styles["Title"], fontName=SANS_BOLD, fontSize=31,
        leading=31, textColor=INK, alignment=TA_LEFT, spaceAfter=10,
    ),
    "cover_title": ParagraphStyle(
        "CoverTitle", parent=styles["Title"], fontName=SANS_BOLD, fontSize=43,
        leading=42, textColor=INK, alignment=TA_LEFT, spaceAfter=12,
    ),
    "subtitle": ParagraphStyle(
        "Subtitle", parent=styles["Normal"], fontName=SANS, fontSize=13,
        leading=19, textColor=MUTED, spaceAfter=12,
    ),
    "h2": ParagraphStyle(
        "H2", parent=styles["Heading2"], fontName=SANS_BOLD, fontSize=15,
        leading=18, textColor=INK, spaceAfter=5,
    ),
    "body": ParagraphStyle(
        "Body", parent=styles["BodyText"], fontName=SANS, fontSize=9.8,
        leading=14.2, textColor=INK, spaceAfter=7,
    ),
    "body_small": ParagraphStyle(
        "BodySmall", parent=styles["BodyText"], fontName=SANS, fontSize=8.6,
        leading=12.5, textColor=INK, spaceAfter=4,
    ),
    "mono": ParagraphStyle(
        "Mono", parent=styles["BodyText"], fontName=MONO_BOLD, fontSize=8.2,
        leading=11, textColor=INK,
    ),
    "mono_white": ParagraphStyle(
        "MonoWhite", parent=styles["BodyText"], fontName=MONO_BOLD, fontSize=8,
        leading=11, textColor=WHITE,
    ),
    "big_number": ParagraphStyle(
        "BigNumber", parent=styles["Normal"], fontName=MONO_BOLD, fontSize=17,
        leading=19, textColor=INK, alignment=TA_CENTER,
    ),
    "center": ParagraphStyle(
        "Center", parent=styles["BodyText"], fontName=SANS_BOLD, fontSize=10,
        leading=14, textColor=INK, alignment=TA_CENTER,
    ),
}


class AccentRule(Flowable):
    def __init__(self, width=62 * mm, height=4):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(INK)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)


def P(text, style="body"):
    return Paragraph(text, ST[style])


def label(text, color=TOMATO):
    table = Table([[P(text.upper(), "mono_white")]], colWidths=[None])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 1.4, INK),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    table.hAlign = "LEFT"
    return table


def card(number, title, text, accent=MUSTARD, width=82 * mm, height=44 * mm):
    number_cell = Table([[P(number, "big_number")]], colWidths=[14 * mm], rowHeights=[14 * mm])
    number_cell.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("BOX", (0, 0), (-1, -1), 1.5, INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    copy = [P(title, "h2"), P(text, "body_small")]
    table = Table([[number_cell, copy]], colWidths=[17 * mm, width - 17 * mm], rowHeights=[height])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 1.5, INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, -1), 8),
        ("RIGHTPADDING", (0, 0), (0, -1), 3),
        ("TOPPADDING", (0, 0), (0, -1), 11),
        ("BOTTOMPADDING", (0, 0), (0, -1), 11),
        ("LEFTPADDING", (1, 0), (1, -1), 10),
        ("RIGHTPADDING", (1, 0), (1, -1), 10),
        ("TOPPADDING", (1, 0), (1, -1), 11),
        ("BOTTOMPADDING", (1, 0), (1, -1), 11),
        ("LINEBELOW", (0, 0), (-1, -1), 4, INK),
    ]))
    return table


def full_card(title, body, accent=TOMATO):
    table = Table([
        [P(title.upper(), "mono_white")],
        [P(body, "body")],
    ], colWidths=[172 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), accent),
        ("BACKGROUND", (0, 1), (0, 1), PAPER),
        ("BOX", (0, 0), (-1, -1), 1.5, INK),
        ("LINEBELOW", (0, 0), (0, 0), 1.5, INK),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (0, 0), 7),
        ("BOTTOMPADDING", (0, 0), (0, 0), 7),
        ("TOPPADDING", (0, 1), (0, 1), 10),
        ("BOTTOMPADDING", (0, 1), (0, 1), 10),
    ]))
    return table


def bullet_list(items, font_size=9.2):
    rows = []
    for item in items:
        rows.append([
            P("+", "big_number"),
            Paragraph(item, ParagraphStyle(
                "Bullet", parent=ST["body"], fontSize=font_size,
                leading=font_size * 1.45, spaceAfter=0,
            )),
        ])
    table = Table(rows, colWidths=[11 * mm, 159 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (0, -1), "MIDDLE"),
        ("VALIGN", (1, 0), (1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (0, -1), MUSTARD),
        ("BOX", (0, 0), (-1, -1), 1.2, INK),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#CDBFA8")),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (0, -1), 4),
        ("RIGHTPADDING", (0, 0), (0, -1), 4),
        ("LEFTPADDING", (1, 0), (1, -1), 11),
        ("RIGHTPADDING", (1, 0), (1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def section_header(number, eyebrow, title, subtitle=None):
    result = [P(f"[ {number} - {eyebrow.upper()} ]", "eyebrow"), P(title, "title"), AccentRule(), Spacer(1, 8 * mm)]
    if subtitle:
        result.extend([P(subtitle, "subtitle"), Spacer(1, 2 * mm)])
    return result


def folder_row(folder, requirement, details, accent):
    left = Table([[P(folder, "mono")]], colWidths=[33 * mm])
    left.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("BOX", (0, 0), (-1, -1), 1.4, INK),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return [left, [P(requirement, "h2"), P(details, "body_small")]]


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(MUSTARD)
    canvas.rect(0, PAGE_H - 18 * mm, PAGE_W, 18 * mm, fill=1, stroke=0)
    canvas.setFillColor(TOMATO)
    canvas.rect(PAGE_W - 6 * mm, 0, 6 * mm, PAGE_H - 18 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(INK)
    canvas.setLineWidth(1.6)
    canvas.line(0, PAGE_H - 18 * mm, PAGE_W, PAGE_H - 18 * mm)

    if LOGO_PATH.exists():
        canvas.drawImage(str(LOGO_PATH), 15 * mm, PAGE_H - 14.3 * mm, width=40 * mm, height=11.5 * mm,
                         preserveAspectRatio=True, anchor="sw", mask="auto")
    canvas.setFillColor(INK)
    canvas.setFont(MONO_BOLD, 7.5)
    canvas.drawRightString(PAGE_W - 14 * mm, PAGE_H - 10.8 * mm, "ENTANGLE 2K26 / CHALLENGE TASK")

    canvas.setStrokeColor(INK)
    canvas.setLineWidth(1)
    canvas.line(15 * mm, 13 * mm, PAGE_W - 15 * mm, 13 * mm)
    canvas.setFont(MONO, 7)
    canvas.drawString(15 * mm, 8.5 * mm, "IMAGINE. BUILD. ENTANGLE.")
    canvas.drawCentredString(PAGE_W / 2, 8.5 * mm, "VASTUCHITRA")
    canvas.drawRightString(PAGE_W - 15 * mm, 8.5 * mm, f"{doc.page:02d} / TASK")
    canvas.restoreState()


def build_story():
    story = []

    # Cover
    story += [
        Spacer(1, 10 * mm),
        label("Challenge task / official document"),
        Spacer(1, 12 * mm),
        P("Build a world.<br/>Not just a render.", "cover_title"),
        AccentRule(78 * mm, 5),
        Spacer(1, 11 * mm),
        P(
            "Create a compelling real-time architectural visualization in Unreal Engine 5. "
            "Develop the materials, lighting, environment, camera composition, visual storytelling, "
            "and a purposeful Blueprint-driven interaction that turns the scene into an experience "
            "people can see, explore, and feel.",
            "subtitle",
        ),
        Spacer(1, 14 * mm),
        AccentRule(172 * mm, 2),
        Spacer(1, 9 * mm),
        P(
            "Build one coherent architectural world with a clear idea, a polished visual language, "
            "and a simple interaction that proves the scene is designed to be experienced - not only viewed.",
            "body",
        ),
        PageBreak(),
    ]

    # Objective
    story += section_header(
        "01", "The task", "What you are creating.",
        "Your goal is to communicate one strong architectural idea through a finished real-time scene - not a collection of disconnected effects.",
    )
    story += [
        full_card(
            "Task statement",
            "Build a visually convincing architectural experience in Unreal Engine 5. Establish one clear concept, develop the environment, create believable materials, light and compose the scene, add a purposeful Blueprint interaction, and produce final images that communicate your design story.",
            TOMATO,
        ),
        Spacer(1, 6 * mm),
        bullet_list([
            "Start with a concise concept: mood, time of day, use case, audience, and intended feeling.",
            "Develop a coherent environment around the architecture using appropriate landscape, vegetation, context, props, and atmosphere.",
            "Build believable materials with considered scale, roughness, reflections, variation, and detail.",
            "Use lighting to reveal form, depth, hierarchy, circulation, and the emotional tone of the scene.",
            "Create intentional camera views with a clear hero frame and supporting perspectives.",
            "Build one purposeful Unreal Engine 5 Blueprint interaction, then polish and capture the final work inside Unreal Engine 5.",
        ]),
        Spacer(1, 6 * mm),
        full_card(
            "AI workflow policy",
            "AI tools may support ideation, research, planning, workflow documentation, code or Blueprint troubleshooting, and licensed asset prototyping when their use is disclosed. AI may not generate, replace, enhance, upscale, retouch, inpaint, outpaint, colour-grade, or post-process any submitted final image. Every submitted image must be a raw export from the completed Unreal Engine 5 scene; native Unreal post-process settings are allowed.",
            OLIVE,
        ),
        PageBreak(),
    ]

    # Build modules
    story += section_header(
        "02", "Build requirements", "Six parts of a complete scene.",
        "Treat these as connected parts of one visual system. Strong entries make every decision support the same idea.",
    )
    grid = [
        [card("01", "Concept and environment", "Define the story, audience, mood, time of day, landscape, context, vegetation, props, atmosphere, and depth.", MUSTARD, height=47 * mm),
         card("02", "Materials", "Develop accurate scale, texture detail, roughness, reflectivity, variation, and clean UV presentation.", OLIVE, height=47 * mm)],
        [card("03", "Lighting", "Use natural and artificial light to shape form, guide attention, and support the intended mood.", TOMATO, height=47 * mm),
         card("04", "Camera and composition", "Choose focal length, height, framing, exposure, and visual hierarchy deliberately. Include one hero angle.", MUSTARD, height=47 * mm)],
        [card("05", "Blueprint interaction", "Build one clear, reliable interaction in Unreal Engine 5 that adds purpose to the experience.", OLIVE, height=47 * mm),
         card("06", "Final polish", "Check collisions, visible errors, texture quality, reflections, shadows, performance, and presentation consistency.", TOMATO, height=47 * mm)],
    ]
    requirements = Table(grid, colWidths=[84 * mm, 84 * mm], rowHeights=[47 * mm, 47 * mm, 47 * mm])
    requirements.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story += [requirements, PageBreak()]

    # UE capture
    story += section_header(
        "03", "Unreal Engine finish", "Render and capture it properly.",
        "Final images must come from the completed Unreal Engine scene. A screen photograph, phone photo, or unfinished editor view is not a final render.",
    )
    story += [
        full_card(
            "Required final image set",
            "Submit at least <b>three</b> polished final images: one hero image and at least two supporting views. Recommended minimum resolution is <b>2560 x 1440</b>. Use JPG or PNG and keep the image free from editor overlays, selection outlines, debug text, and UI panels.",
            TOMATO,
        ),
        Spacer(1, 6 * mm),
        Table([
            [card("A", "Movie Render Queue", "Recommended for controlled high-quality output, anti-aliasing, image sequences, cinematic cameras, and repeatable render settings.", MUSTARD, 55 * mm, 70 * mm),
             card("B", "High Resolution Screenshot", "Suitable for polished still images when configured carefully. Capture from the final camera and verify the exported resolution.", OLIVE, 55 * mm, 70 * mm),
             card("C", "Lumen or Path Tracer", "Either approach is accepted. Choose the method that best supports your scene, hardware, time, and visual intent.", TOMATO, 55 * mm, 70 * mm)],
        ], colWidths=[56 * mm, 56 * mm, 56 * mm], style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])),
        Spacer(1, 7 * mm),
        bullet_list([
            "Lock final cameras using Cine Camera Actors and check composition at the intended aspect ratio.",
            "Check exposure, colour balance, reflection quality, shadow noise, texture streaming, and anti-aliasing before capture.",
            "Use Unreal Engine's native post-process tools for the final look. Do not alter submitted images with AI or external image-editing software.",
            "Keep a clean exported copy of every submitted image and verify it opens at full resolution.",
        ], font_size=8.8),
        PageBreak(),
    ]

    # Bonus interaction
    story += section_header(
        "04", "Bonus marks", "Build beyond the still.",
        "Polished Blueprint interaction and a clear walkthrough can earn additional marks by showing how the scene behaves and how the experience is navigated.",
    )
    story += [
        full_card(
            "Blueprint interaction - bonus marks",
            "Build the interaction in Unreal Engine 5 using Blueprints or another native Unreal workflow. Keep it simple, clear, and reliable rather than adding unfinished systems.",
            OLIVE,
        ),
        Spacer(1, 6 * mm),
        bullet_list([
            "Open and close a door, window, screen, or movable architectural element.",
            "Switch between day and night lighting or control selected lights.",
            "Offer material or colour variants for one meaningful design element.",
            "Create a guided camera transition, viewpoint selector, or simple exploration mode.",
            "Add a focused environmental response such as rain, fog, ambience, or animated landscape detail.",
        ]),
        Spacer(1, 6 * mm),
        full_card(
            "Walkthrough or cinematic - bonus marks",
            "Include a short MP4 walkthrough or cinematic so the jury can understand the spatial sequence quickly. Recommended: 30 to 90 seconds, 1920 x 1080 or higher, clean cuts, readable pacing, and no editor interface in the recording.",
            MUSTARD,
        ),
        Spacer(1, 6 * mm),
        P("Bonus work strengthens the technical and presentation assessment only when it is relevant, stable, and polished. It does not replace material quality, lighting, composition, or a strong hero image.", "subtitle"),
        PageBreak(),
    ]

    # Deliverables
    story += section_header(
        "05", "Submission package", "One archive. Clear folders.",
        "Name the outer folder and final archive after yourself. Keep the structure exact so the jury can verify the work quickly.",
    )
    folder_data = [
        folder_row("Images/", "Required final renders", "At least three final JPG or PNG images, including one hero image and supporting views.", MUSTARD),
        folder_row("Video/", "Walkthrough or cinematic", "A short MP4 walkthrough or cinematic that clearly presents the spatial experience.", OLIVE),
        folder_row("Executable/", "Packaged Unreal build", "The packaged Windows executable and every support folder or file required for it to run.", TOMATO),
    ]
    folder_table = Table(folder_data, colWidths=[39 * mm, 133 * mm], rowHeights=[34 * mm, 34 * mm, 34 * mm])
    folder_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 1.5, INK),
        ("INNERGRID", (0, 0), (-1, -1), 0.8, INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [
        folder_table,
        Spacer(1, 7 * mm),
        full_card(
            "Archive name",
            "<b>YOUR_FULL_NAME.zip</b><br/>Accepted archive formats: ZIP, RAR, or 7Z. Maximum archive size: 5 GB. Verify that the archive opens and that the packaged build launches before uploading.",
            TOMATO,
        ),
        Spacer(1, 6 * mm),
        full_card(
            "Keep your editable project",
            "Do not upload the raw Unreal Engine project unless the organizers request it. Keep the complete editable project, source assets, and production files available for possible process verification.",
            OLIVE,
        ),
        Spacer(1, 5 * mm),
        P("After downloading the task files, submit a short creative brief of roughly 100 words describing your concept, mood, material direction, lighting approach, and intended experience.", "body"),
        PageBreak(),
    ]

    # Evaluation
    story += section_header(
        "06", "Evaluation", "What the jury will look for.",
        "The jury reviews the complete submission. A technically complex scene is not automatically stronger than a simple, coherent, beautifully resolved one.",
    )
    rubric = [
        [P("20%", "big_number"), P("Concept and visual storytelling", "h2"), P("A clear idea, strong mood, spatial narrative, and purposeful creative direction.", "body_small")],
        [P("20%", "big_number"), P("Environment and materials", "h2"), P("Believable context, scale, surfaces, variation, detail, and overall scene coherence.", "body_small")],
        [P("15%", "big_number"), P("Lighting and atmosphere", "h2"), P("Form, depth, exposure, colour, shadows, reflections, and emotional tone.", "body_small")],
        [P("15%", "big_number"), P("Camera and composition", "h2"), P("Hero angle, supporting views, framing, focal length, hierarchy, and visual clarity.", "body_small")],
        [P("20%", "big_number"), P("Technical execution", "h2"), P("Scene structure, Blueprint stability, performance, asset organization, packaged build, and completeness.", "body_small")],
        [P("10%", "big_number"), P("Presentation and submission", "h2"), P("Final captures, walkthrough quality, file structure, naming, packaging, and reliable delivery.", "body_small")],
    ]
    rubric_table = Table(rubric, colWidths=[23 * mm, 58 * mm, 91 * mm], rowHeights=[23 * mm] * 6)
    rubric_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), MUSTARD),
        ("BACKGROUND", (1, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 1.5, INK),
        ("INNERGRID", (0, 0), (-1, -1), 0.8, INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [
        rubric_table,
        Spacer(1, 7 * mm),
        full_card(
            "Bonus marks",
            "Polished Blueprint interaction and a clear walkthrough can strengthen the technical execution and presentation scores. Relevance, stability, and finish matter more than complexity.",
            OLIVE,
        ),
        PageBreak(),
    ]

    # Rules and checklist
    story += section_header(
        "07", "Final checks", "Before you submit.",
        "Run this checklist once at full resolution and once on a clean computer if possible.",
    )
    story += [
        bullet_list([
            "The final environment, materials, scene assembly, camera setup, lighting, and renders are completed in Unreal Engine 5.",
            "The hero image is clearly identifiable and the supporting views add useful information.",
            "Final images contain no editor UI, debug text, selection outline, broken texture, missing asset, or obvious render artefact.",
            "The packaged executable launches and includes every required support file.",
            "The archive and outer folder use your full name and contain Images, Video, and Executable folders.",
            "AI use is disclosed and limited to permitted workflow support; submitted images are raw Unreal Engine 5 exports with no AI enhancement or external post-processing.",
            "The work is your own, was created for this challenge, and is uploaded before the deadline.",
        ], font_size=8.7),
        Spacer(1, 6 * mm),
        full_card(
            "Deadline",
            "<b>09 September 2026 at 11:59 AM IST.</b> Upload early enough to verify completion. Late, incomplete, inaccessible, or corrupted submissions may not be evaluated.",
            TOMATO,
        ),
        Spacer(1, 6 * mm),
        full_card(
            "Need help?",
            "If any point is unclear or you run into a problem, please ask us rather than guessing. We are here to help with questions and submission issues - use the help option on the event website or email <b>entangle2k26@vkarch.com</b> with your full name, registered email address, and a short description.",
            OLIVE,
        ),
    ]
    return story


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=18 * mm,
        topMargin=27 * mm,
        bottomMargin=19 * mm,
        title="Entangle 2K26 Challenge Task",
        author="Vastuchitra",
        subject="Official challenge task, requirements, deliverables, and evaluation criteria",
        creator="Vastuchitra - Entangle 2K26",
    )
    doc.build(build_story(), onFirstPage=draw_page, onLaterPages=draw_page)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
