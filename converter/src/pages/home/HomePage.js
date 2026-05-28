import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import { useToast } from "../../design_kit/notification/ToastContext";
import { useTheme } from "../../theme/ThemeContext";

function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { theme, setTheme } = useTheme();

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (selectedFiles.length === 0) {
      showToast("Файлы не выбраны!");
      return;
    }

    navigate("/process", { state: { files: selectedFiles } });
  };

  return (
    <div className="parent-container">
      <div className="container">
        <h1 className="title">
          Веб-приложение
          <br></br>для обработки текста, полученного nbconvert
          <br></br>и содержащего формулы Latex</h1>
        <div className="instruction-card">
        <h2>Как пользоваться приложением</h2>

        <ol>
          <li>Загрузите один или несколько файлов формата .ipynb.</li>
          <li>Выберите ячейки, которые должны попасть в итоговый документ.</li>
          <li>Настройте шаблон оформления, фон кода, отступы и формат результата.</li>
          <li>Нажмите кнопку «Сконвертировать», чтобы получить LaTeX и PDF.</li>
          <li>При необходимости отредактируйте LaTeX-код во встроенном редакторе.</li>
          <li>Нажмите «Обновить PDF», чтобы пересобрать документ после ручных правок.</li>
          <li>Скачайте готовый .tex или .pdf файл.</li>
        </ol>
      </div>
        <div className="home-theme-switcher">
          <button
            className={theme === "light" ? "theme-button theme-button-active" : "theme-button"}
            onClick={() => setTheme("light")}
          >
            Светлая
          </button>
          <button
            className={theme === "dark" ? "theme-button theme-button-active" : "theme-button"}
            onClick={() => setTheme("dark")}
          >
            Темная
          </button>
        </div>
        <div>
          <label htmlFor="file-input" className="file-label">
            Выбрать файлы
          </label>
          <input
            id="file-input"
            type="file"
            className="file-input"
            accept=".ipynb"
            multiple
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div className="footer">
        <a
          href="https://github.com/Maxim424/ipynb-latex-converter.git"
          target="_blank"
          rel="noopener noreferrer"
        >
          Исходный код на GitHub
        </a>
        <a href={`${process.env.REACT_APP_API_URL}docs`}>Документация</a>
      </div>
    </div>
  );
}

export default HomePage;