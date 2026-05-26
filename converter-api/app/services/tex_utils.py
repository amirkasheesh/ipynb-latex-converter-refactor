import re
from pathlib import Path


def html_to_rgb(color: str) -> str:
    color = color.lstrip('#')
    r, g, b = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))
    return f"{r},{g},{b}"

def replace_document_class(tex: str, document_class: str) -> str:
    return re.sub(
        r"\\documentclass(?:\[[^\]]*\])?\{[^}]+\}",
        lambda _: document_class,
        tex,
        count=1
    )


def apply_geometry(tex: str, geometry_settings: str) -> str:
    tex = re.sub(r"\\usepackage(?:\[[^\]]*\])?\{geometry\}\n?", "", tex)
    tex = re.sub(r"\\geometry\{[^}]*\}\n?", "", tex)

    return re.sub(
        r"(\\documentclass(?:\[[^\]]*\])?\{[^}]+\}\n?)",
        lambda match: match.group(1) + geometry_settings + "\n",
        tex,
        count=1
    )

def wrap_long_display_math(tex: str) -> str:
    max_formula_length = 160

    def should_wrap(formula: str) -> bool:
        compact_formula = re.sub(r"\s+", "", formula)

        if len(compact_formula) < max_formula_length:
            return False

        if r"\resizebox" in formula:
            return False

        skip_environments = [
            r"\begin{aligned}",
            r"\begin{split}",
            r"\begin{array}",
            r"\begin{matrix}",
            r"\begin{pmatrix}",
            r"\begin{bmatrix}",
            r"\begin{cases}",
        ]

        for environment in skip_environments:
            if environment in formula:
                return False

        return True

    def wrap_formula(formula: str) -> str:
        return (
            r"\resizebox{\textwidth}{!}{$\displaystyle "
            + formula.strip()
            + r"$}"
        )

    def replace_square_math(match):
        formula = match.group(1)

        if not should_wrap(formula):
            return match.group(0)

        return r"\[" + "\n" + wrap_formula(formula) + "\n" + r"\]"

    def replace_dollar_math(match):
        formula = match.group(1)

        if not should_wrap(formula):
            return match.group(0)

        return "$$\n" + wrap_formula(formula) + "\n$$"

    def replace_equation_star(match):
        formula = match.group(1)

        if not should_wrap(formula):
            return match.group(0)

        return (
            r"\begin{equation*}" + "\n"
            + wrap_formula(formula) + "\n"
            + r"\end{equation*}"
        )

    def replace_equation(match):
        formula = match.group(1)

        if not should_wrap(formula):
            return match.group(0)

        return (
            r"\begin{equation}" + "\n"
            + wrap_formula(formula) + "\n"
            + r"\end{equation}"
        )

    tex = re.sub(r"\\\[(.*?)\\\]", replace_square_math, tex, flags=re.DOTALL)
    tex = re.sub(r"\$\$(.*?)\$\$", replace_dollar_math, tex, flags=re.DOTALL)
    tex = re.sub(
        r"\\begin\{equation\*\}(.*?)\\end\{equation\*\}",
        replace_equation_star,
        tex,
        flags=re.DOTALL,
    )
    tex = re.sub(
        r"\\begin\{equation\}(.*?)\\end\{equation\}",
        replace_equation,
        tex,
        flags=re.DOTALL,
    )

    return tex

def apply_document_template(tex: str, document_template: str) -> str:
    if document_template == "standard":
        return tex

    if document_template == "article":
        tex = replace_document_class(
            tex,
            r"\documentclass[11pt,a4paper]{article}"
        )
        tex = apply_geometry(
            tex,
            r"\usepackage[a4paper,left=25mm,right=25mm,top=25mm,bottom=25mm]{geometry}"
        )
        return tex

    if document_template == "gost":
        tex = replace_document_class(
            tex,
            r"\documentclass[14pt,a4paper]{extarticle}"
        )
        tex = apply_geometry(
            tex,
            r"\usepackage[a4paper,left=30mm,right=15mm,top=20mm,bottom=20mm]{geometry}"
        )
        tex = tex.replace(
            r"\begin{document}",
            r"\linespread{1.3}" + "\n" + r"\begin{document}",
            1
        )
        return tex

    return tex

def patch_tex_file(
        tex: str,
        code_bg: str,
        remove_prompt: bool,
        indent: int,
        remove_comments: bool,
        document_template: str = "standard"
) -> str:
    rgb_code = html_to_rgb(code_bg)

    # Настраиваем шрифты, цвет кодовых ячеек и отступ текста
    tex = tex.replace(
    r"\usepackage{graphicx}",
    r"""\usepackage{graphicx}
\usepackage{tcolorbox}
\tcbuselibrary{listings, breakable}
\definecolor{codebg}{RGB}{""" + rgb_code + r"""}
\usepackage{fontspec}
\usepackage{polyglossia}
\usepackage{titlesec}
\setdefaultlanguage{russian}
\setmainfont{DejaVu Serif}
\newfontfamily\cyrillicfonttt{DejaVu Sans Mono}
\setlength{\parindent}{""" + str(indent) + r"""mm}

\setcounter{secnumdepth}{5}
\setcounter{tocdepth}{5}

\titleformat{\paragraph}[block]
{\normalfont\normalsize\bfseries}
{\theparagraph.}
{0.8em}
{}

\titlespacing*{\paragraph}
{0pt}
{1.2ex plus 0.5ex minus .2ex}
{0.6ex}

\titleformat{\subparagraph}[block]
{\normalfont\small\bfseries}
{\thesubparagraph.}
{0.8em}
{}

\titlespacing*{\subparagraph}
{0pt}
{1ex plus 0.5ex minus .2ex}
{0.4ex}
"""
)

    # Заменяем стандартный цвет кодовых ячеек на свой
    tex = tex.replace("colback=cellbackground", "colback=codebg")

    # Удаляем автоматически сгенерированный заголовок
    tex = tex.replace(r"\maketitle", "")
    
    tex = apply_document_template(tex, document_template)
    tex = wrap_long_display_math(tex)

    # Удаляем номера ячеек, если требуется
    if remove_prompt:
        tex = re.sub(
            r"\\prompt\{In\}\{incolor\}\{[^\}]*\}\{\\boxspacing\}\n?", "", tex)
        tex = re.sub(
            r"\\prompt\{Out\}\{outcolor\}\{[^\}]*\}\{[^\}]*\}", "", tex)

    # Удаляем комментарии, если требуется
    if remove_comments:
        tex = re.sub(r'(?m)^\s*%.*\n?', '', tex)

    return tex


def split_tex_file(tex_path: Path):
    with tex_path.open("r", encoding="utf-8") as f:
        tex = f.read()

    preamble_match = re.search(r"^(.*?)\\begin{document}", tex, re.DOTALL)
    body_match = re.search(
        r"\\begin{document}(.*?)\\end{document}", tex, re.DOTALL)

    if not preamble_match or not body_match:
        raise ValueError(
            f"Не удалось найти преамбулу или тело документа в файле {tex_path}")

    preamble = preamble_match.group(1).strip()
    body = body_match.group(1).strip()

    return preamble, body


def overwrite_with_body_only(tex_path: Path):
    _, body = split_tex_file(tex_path)
    with tex_path.open("w", encoding="utf-8") as f:
        f.write(body)
