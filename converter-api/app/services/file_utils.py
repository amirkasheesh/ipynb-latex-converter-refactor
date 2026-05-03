from fastapi.responses import JSONResponse, FileResponse
from pathlib import Path
import os
import zipfile
import shutil
import json

UPLOAD_DIR = Path("./uploaded_files")
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

async def validate_ipynb_file(file):
    filename = file.filename or ""

    if not filename.lower().endswith(".ipynb"):
        raise ValueError("Можно загружать только файлы .ipynb")

    content = await file.read()

    if len(content) > MAX_UPLOAD_SIZE:
        raise ValueError("Размер файла не должен превышать 50 МБ")

    try:
        notebook = json.loads(content.decode("utf-8"))
    except Exception:
        raise ValueError("Файл должен быть корректным JSON-документом Jupyter Notebook")

    if not isinstance(notebook, dict):
        raise ValueError("Некорректная структура .ipynb файла")

    if "cells" not in notebook or not isinstance(notebook["cells"], list):
        raise ValueError("В .ipynb файле должен быть список ячеек cells")

    await file.seek(0)

def validate_selected_cells(raw_selected_cells: str):
    try:
        selected_cells = json.loads(raw_selected_cells)
    except Exception:
        raise ValueError("selectedCells должен быть корректным JSON")

    if not isinstance(selected_cells, list):
        raise ValueError("selectedCells должен быть списком")

    for cell in selected_cells:
        if not isinstance(cell, dict):
            raise ValueError("Каждый элемент selectedCells должен быть объектом")

        if "index" not in cell or not isinstance(cell["index"], int) or cell["index"] < 0:
            raise ValueError("Каждая выбранная ячейка должна содержать неотрицательный index")

        if "includeSource" not in cell or not isinstance(cell["includeSource"], bool):
            raise ValueError("Каждая выбранная ячейка должна содержать includeSource типа boolean")

        if "includeResults" not in cell or not isinstance(cell["includeResults"], bool):
            raise ValueError("Каждая выбранная ячейка должна содержать includeResults типа boolean")

    return selected_cells


def validate_merge_mode(merge_mode: str):
    allowed_modes = {"single", "include"}

    if merge_mode not in allowed_modes:
        raise ValueError("mergeMode должен быть single или include")


def validate_bool_form_value(value: str, field_name: str):
    if value not in {"true", "false"}:
        raise ValueError(f"{field_name} должен быть true или false")


def remove_extension(file_name):
    return os.path.splitext(file_name)[0]


def get_extension(file_name):
    _, extension = os.path.splitext(file_name)
    return extension.lstrip('.')


def create_zip_with_images(output_dir, unique_id):
    zip_path = output_dir / f"{unique_id}.zip"
    output_tex_dir = output_dir / "tex"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for folder_path, _, filenames in os.walk(output_tex_dir):
            for filename in filenames:
                file_path = Path(folder_path) / filename
                arcname = file_path.relative_to(output_dir)
                zipf.write(file_path, arcname=arcname)


def get_preview_response(file_name: str):
    requiredFileExtension = get_extension(file_name)
    file_name = remove_extension(file_name)
    pdf_file_path_single = UPLOAD_DIR / file_name / f"{file_name}.pdf"
    pdf_file_path_include = UPLOAD_DIR / file_name / "main.pdf"
    tex_file_path_single = UPLOAD_DIR / file_name / "tex" / f"{file_name}.tex"
    tex_file_path_include = UPLOAD_DIR / file_name / "tex" / "main.tex"

    if requiredFileExtension == "pdf":
        if pdf_file_path_single.exists():
            return FileResponse(pdf_file_path_single, media_type="application/pdf")
        elif pdf_file_path_include.exists():
            return FileResponse(pdf_file_path_include, media_type="application/pdf")
    elif requiredFileExtension == "tex":
        if tex_file_path_single.exists():
            return FileResponse(tex_file_path_single, media_type="text/plain")
        elif tex_file_path_include.exists():
            return FileResponse(tex_file_path_include, media_type="text/plain")
    return JSONResponse(content={"error": f"File not found: {file_name}"}, status_code=404)


def get_download_response(file_name: str):
    requiredFileExtension = get_extension(file_name)
    file_name = remove_extension(file_name)
    pdf_file_path_single = UPLOAD_DIR / file_name / f"{file_name}.pdf"
    pdf_file_path_include = UPLOAD_DIR / file_name / "main.pdf"
    tex_file_path = UPLOAD_DIR / file_name / f"{file_name}.zip"

    if requiredFileExtension == "pdf":
        if pdf_file_path_single.exists():
            return FileResponse(
                pdf_file_path_single,
                media_type="application/pdf",
                filename=f"{file_name}.pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={file_name}.pdf"}
            )
        elif pdf_file_path_include.exists():
            return FileResponse(
                pdf_file_path_include,
                media_type="application/pdf",
                filename=f"{file_name}.pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={file_name}.pdf"}
            )
    elif requiredFileExtension == "zip" and tex_file_path.exists():
        return FileResponse(
            tex_file_path,
            media_type="application/zip",
            filename=f"{file_name}.zip",
            headers={"Content-Disposition": f"attachment; filename={file_name}.zip"}
        )
    return JSONResponse(content={"error": f"File not found: {file_name}"}, status_code=404)


def clear_directory(directory_path: Path):
    if directory_path.exists() and directory_path.is_dir():
        try:
            shutil.rmtree(directory_path)
        except Exception as e:
            print(f"[ERROR] Failed to delete directory {directory_path}: {e}")


def delete_aux_files(output_tex_dir: Path):
    for aux_files in (output_tex_dir.glob("*.aux"),
                      output_tex_dir.glob("*.log"),
                      output_tex_dir.glob("*.out"),
                      output_tex_dir.glob("*.toc"),
                      output_tex_dir.glob("*.ipynb"),
                      output_tex_dir.glob("*.pdf")):
        for f in aux_files:
            f.unlink(missing_ok=True)
