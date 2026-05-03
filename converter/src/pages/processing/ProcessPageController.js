import React, { useEffect, useState } from "react";
import ProcessPage from "./ProcessPage";
import { useToast } from "../../design_kit/notification/ToastContext";
import { v4 as uuidv4 } from "uuid";

const getSavedSetting = (key, defaultValue) => {
    const savedValue = localStorage.getItem(key);
    return savedValue === null ? defaultValue : savedValue;
};

const getSavedBooleanSetting = (key, defaultValue) => {
    const savedValue = localStorage.getItem(key);

    if (savedValue === null) {
        return defaultValue;
    }

    return savedValue === "true";
};

const ProcessPageController = () => {
    // Отображение файлов
    const [fileContent, setFileContent] = useState("");
    const [fileId, setFileId] = useState("");
    const [previewPdfUrl, setPreviewPdfUrl] = useState("");
    const [previewTexUrl, setPreviewTexUrl] = useState("");
    const [latexText, setLatexText] = useState("");
    const [latexErrorLog, setLatexErrorLog] = useState("");

    // Настройки конвертации
    const [selectedCells, setSelectedCells] = useState([]);
    const [selectionMode, setSelectionMode] = useState("all");
    const [outputSelectionMode, setOutputSelectionMode] = useState("all");

    const [codeBg, setCodeBg] = useState(() =>
    getSavedSetting("codeBg", "#f6f8fa")
    );

    const [includeCellNumbers, setIncludeCellNumbers] = useState(() =>
        getSavedSetting("includeCellNumbers", "true")
    );

    const [indent, setIndent] = useState(() =>
        Number(getSavedSetting("indent", 0))
    );

    const [removeComments, setRemoveComments] = useState(() =>
        getSavedSetting("removeComments", "false")
    );

    const [documentTemplate, setDocumentTemplate] = useState(() =>
        getSavedSetting("documentTemplate", "standard")
    );

    useEffect(() => {
        localStorage.setItem("codeBg", codeBg);
    }, [codeBg]);

    useEffect(() => {
        localStorage.setItem("includeCellNumbers", includeCellNumbers);
    }, [includeCellNumbers]);

    useEffect(() => {
        localStorage.setItem("indent", String(indent));
    }, [indent]);

    useEffect(() => {
        localStorage.setItem("removeComments", removeComments);
    }, [removeComments]);

    useEffect(() => {
        localStorage.setItem("documentTemplate", documentTemplate);
    }, [documentTemplate]);

    const { showToast } = useToast();
    const baseUrl = process.env.REACT_APP_API_URL
    const sessionId = getSessionId();

    function getSessionId() {
        let sessionId = localStorage.getItem("session_id");
        if (!sessionId) {
            sessionId = uuidv4();
            localStorage.setItem("session_id", sessionId);
        }
        return sessionId;
    }

    const handleFileLoad = async (files) => {
        const MAX_FILES = 10;
        const MAX_TOTAL_SIZE_MB = 50;

        const totalSizeMB = files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024);

        if (files.length > MAX_FILES || totalSizeMB > MAX_TOTAL_SIZE_MB) {
            showToast("Превышен лимит при выборе файлов");
            return;
        }

        try {
            let allCells = [];
            let selected = [];
            let totalIndex = 0;

            for (const file of files) {
                let notebook;

                try {
                    const content = await file.text();
                    notebook = JSON.parse(content);
                } catch (error) {
                    showToast(`Файл ${file.name} должен быть корректным JSON-документом Jupyter Notebook`);
                    return;
                }

                if (!notebook || typeof notebook !== "object" || !Array.isArray(notebook.cells)) {
                    showToast(`Файл ${file.name} должен содержать список ячеек cells`);
                    return;
                }

                const cells = notebook.cells;

                const fileCells = cells.map((cell, index) => {
                    selected.push({
                        index: totalIndex + index,
                        includeSource: true,
                        includeResults: true
                    });
                    return cell;
                });

                allCells = allCells.concat(fileCells);
                totalIndex += cells.length;
            }

            setSelectedCells(selected);
            setFileContent(JSON.stringify({ cells: allCells }));

        } catch (error) {
            showToast("Ошибка при чтении файлов");
        }
    };

    const handleCellToggle = (cellIndex) => {
        setSelectedCells((prev) => {
            const existing = prev.find(cell => cell.index === cellIndex);

            if (existing) {
                const updated = {
                    ...existing,
                    includeSource: !existing.includeSource
                };

                if (!updated.includeSource && !updated.includeResults) {
                    return prev.filter(cell => cell.index !== cellIndex);
                }

                return prev.map(cell => cell.index === cellIndex ? updated : cell);
            } else {
                return [...prev, { index: cellIndex, includeSource: true, includeResults: false }];
            }
        });

        setSelectionMode("custom");
    };

    const handleOutputToggle = (cellIndex) => {
        setSelectedCells((prev) => {
            const existing = prev.find(cell => cell.index === cellIndex);

            if (existing) {
                const updated = {
                    ...existing,
                    includeResults: !existing.includeResults
                };

                if (!updated.includeSource && !updated.includeResults) {
                    return prev.filter(cell => cell.index !== cellIndex);
                }

                return prev.map(cell => cell.index === cellIndex ? updated : cell);
            } else {
                return [...prev, { index: cellIndex, includeSource: false, includeResults: true }];
            }
        });

        setSelectionMode("custom");
    };

    const getErrorData = async (response) => {
        try {
            const data = await response.json();

            return {
                message: data.error || "Ошибка конвертации файлов",
                log: data.log || ""
            };
        } catch (error) {
            return {
                message: "Ошибка конвертации файлов",
                log: ""
            };
        }
    };

    const handleCompileTex = async () => {
        if (!fileId) {
            showToast("Сначала необходимо сконвертировать файл");
            return;
        }

        if (!latexText.trim()) {
            showToast("LaTeX-код пустой");
            return;
        }

        const prevPdfUrl = previewPdfUrl;
        setPreviewPdfUrl("loading");

        const formData = new FormData();
        formData.append("texContent", latexText);

        try {
            const response = await fetch(`${baseUrl}compile-tex/`, {
                method: "POST",
                body: formData,
                headers: {
                    "X-Session-ID": sessionId
                }
            });

            if (response.ok) {
                const data = await response.json();
                const cacheKey = Date.now();

                setFileId(data.file_id);
                setPreviewPdfUrl(`${baseUrl}preview/${data.file_id}.pdf?v=${cacheKey}`);
                setPreviewTexUrl(`${baseUrl}preview/${data.file_id}.tex?v=${cacheKey}`);
                setLatexErrorLog("");

                showToast("PDF успешно обновлен из LaTeX-кода");
            } else {
                setPreviewPdfUrl(prevPdfUrl);

                const errorData = await getErrorData(response);
                setLatexErrorLog(errorData.log);
                showToast(errorData.message);
            }
        } catch (error) {
            setPreviewPdfUrl(prevPdfUrl);
            showToast(`Ошибка: ${error}`);
        }
    };

    const handleConvert = async (files, mergeMode = "single") => {
        if (!files || files.length === 0) {
            showToast("Сначала необходимо выбрать файлы");
            return;
        }
        const prevPdfUrl = previewPdfUrl
        const prevTexUrl = previewTexUrl
        setPreviewPdfUrl(`loading`);
        setPreviewTexUrl(`loading`);

        const formData = new FormData();

        // Добавляем все файлы в formData
        files.forEach((file) => {
            formData.append("files", file);
        });

        // Параметры конвертации
        formData.append("selectedCells", JSON.stringify(selectedCells));
        formData.append("codeBg", codeBg);
        formData.append("includeCellNumbers", includeCellNumbers);
        formData.append("indent", indent.toString());
        formData.append("removeComments", removeComments);
        formData.append("mergeMode", mergeMode);
        formData.append("documentTemplate", documentTemplate);

        try {
            const response = await fetch(`${baseUrl}convert/`, {
                method: "POST",
                body: formData,
                headers: {
                    "X-Session-ID": sessionId
                }
            });

            if (response.ok) {
                const data = await response.json();
                setFileId(data.file_id);
                setPreviewPdfUrl(`${baseUrl}preview/${data.file_id}.pdf`);
                setPreviewTexUrl(`${baseUrl}preview/${data.file_id}.tex`);
                setLatexText("");
                setLatexErrorLog("");

                showToast("Файл успешно сконвертирован");
            } else {
                setPreviewPdfUrl(prevPdfUrl);
                setPreviewTexUrl(prevTexUrl);

                const errorData = await getErrorData(response);
                setLatexErrorLog(errorData.log);
                showToast(errorData.message);
            }
        } catch (error) {
            setPreviewPdfUrl(prevPdfUrl);
            setPreviewTexUrl(prevTexUrl);

            showToast(`Ошибка: ${error}`);
        }
    };

    const handleDownload = async (file, format) => {
        if (!fileId) {
            showToast("Сначала необходимо сконвертировать файлы");
            return;
        }

        const fileExtension = format === "pdf" ? ".pdf" : ".tex";

        try {
            const url = `${baseUrl}download/${fileId}${fileExtension}`
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = file.name.replace(".ipynb", fileExtension);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            showToast(`Ошибка ${error}`);
        }
    };

    return (
        <ProcessPage
            fileContent={fileContent}
            handleFileLoad={handleFileLoad}
            onConvert={handleConvert}
            handleDownload={handleDownload}
            selectedCells={selectedCells}
            setSelectedCells={setSelectedCells}
            handleCellToggle={handleCellToggle}
            handleOutputToggle={handleOutputToggle}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            outputSelectionMode={outputSelectionMode}
            setOutputSelectionMode={setOutputSelectionMode}
            previewPdfUrl={previewPdfUrl}
            previewTexUrl={previewTexUrl}
            codeBg={codeBg}
            setCodeBg={setCodeBg}
            includeCellNumbers={includeCellNumbers}
            setIncludeCellNumbers={setIncludeCellNumbers}
            indent={indent}
            setIndent={setIndent}
            removeComments={removeComments}
            setRemoveComments={setRemoveComments}
            documentTemplate={documentTemplate}
            setDocumentTemplate={setDocumentTemplate}
            latexText={latexText}
            setLatexText={setLatexText}
            onCompileTex={handleCompileTex}
            latexErrorLog={latexErrorLog}
            setLatexErrorLog={setLatexErrorLog}
        />
    );
};

export default ProcessPageController;
