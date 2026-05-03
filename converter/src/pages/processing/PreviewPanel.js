import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import React, { useEffect, useState } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import "./styles/PreviewPanel.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const PreviewPanel = ({ viewMode, previewTexUrl, previewPdfUrl, width, latexText, setLatexText }) => {
    const src = viewMode === "latex" ? previewTexUrl : previewPdfUrl;
    const [numPages, setNumPages] = useState(null);

    useEffect(() => {
        if (!previewTexUrl || previewTexUrl === "loading") {
            return;
        }

        fetch(previewTexUrl)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Ошибка загрузки .tex файла");
                }
                return res.text();
            })
            .then(setLatexText)
            .catch(() => setLatexText("Не удалось загрузить документ"));
    }, [previewTexUrl, setLatexText]);

    return (
        <div className="preview-panel">
            {viewMode === "latex" ? (
                previewTexUrl === '' ? (
                    <div className="no-preview-block">
                        <img src={require('./../../design_kit/icons/note.svg').default} alt="Note" className="no-preview-block-image" />
                        <span>Сконвертируйте, чтобы увидеть превью</span>
                    </div>
                ) : (
                    previewTexUrl === 'loading' ? (
                        <div className="no-preview-block">
                            <img
                                src={require('./../../design_kit/icons/cloud.svg').default}
                                alt="Note"
                                className="no-preview-block-image"
                            />
                            <span>Загрузка превью</span>
                        </div>
                    ) : (
                        <CodeMirror
                            className="latex-editor"
                            value={latexText}
                            height="100%"
                            extensions={[StreamLanguage.define(stex)]}
                            onChange={(value) => setLatexText(value)}
                            basicSetup={{
                                lineNumbers: true,
                                highlightActiveLine: true,
                                foldGutter: true
                            }}
                        />
                    )
                )
            ) : (
                <div
                    style={{
                        overflowY: "auto",
                        height: "100%",
                        boxSizing: "border-box",
                        width: width,
                        display: "block"
                    }}
                >
                    {previewPdfUrl === '' ? (
                        <div className="no-preview-block" style={{
                            height: "100%",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <img
                                src={require('./../../design_kit/icons/note.svg').default}
                                alt="Note"
                                className="no-preview-block-image"
                            />
                            <span>Сконвертируйте, чтобы увидеть превью</span>
                        </div>
                    ) : (previewPdfUrl === 'loading' ? (
                        <div className="no-preview-block" style={{
                            height: "100%",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <img
                                src={require('./../../design_kit/icons/cloud.svg').default}
                                alt="Note"
                                className="no-preview-block-image"
                            />
                            <span>Загрузка превью</span>
                        </div>
                    ) : (
                        <Document
                            file={src}
                            key={src}
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            loading="Загрузка PDF..."
                            error="Не удалось загрузить PDF"
                        >
                            {width > 0 && Array.from(new Array(numPages), (_, index) => (
                                <Page
                                    key={`page_${index + 1}`}
                                    pageNumber={index + 1}
                                    width={width}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            ))}
                        </Document>
                    )
                    )}
                </div>
            )}
        </div >
    );
};

export default PreviewPanel;
