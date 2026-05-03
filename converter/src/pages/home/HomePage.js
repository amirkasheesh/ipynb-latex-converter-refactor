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