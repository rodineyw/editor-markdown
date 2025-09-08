// renderer.js

// console.log(window.electronAPI);

const markdownInput = document.getElementById('markdown-input');
const htmlOutput = document.getElementById('html-output');

const renderMarkdown = async (text) => {
    const htmlText = await window.electronAPI.markdownToHtml(text);
    htmlOutput.innerHTML = htmlText;
};

markdownInput.addEventListener('input', (event) => {
    renderMarkdown(event.target.value);
});

window.electronAPI.onFileContent((content) => {
    console.log('Renderer recebeu o conteúdo do arquivo!');
    markdownInput.value = content;
    renderMarkdown(content);
});

window.electronAPI.onTriggerSave(async () => {
    const content = markdownInput.value;
    const result = await window.electronAPI.saveFile(content);
    if (result.success) {
        console.log(`Arquivo salvo com sucesso em: ${result.path}`);
    } else {
        console.error(`Falha ao salvar o arquivo: ${result.reason}`);
    }
});