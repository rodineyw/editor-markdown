// renderer.js

const markdownInput = document.getElementById('markdown-input');
const htmlOutput = document.getElementById('html-output');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnExportHtml = document.getElementById('btn-export-html');
const btnExportPdf = document.getElementById('btn-export-pdf');
const themeToggle = document.getElementById('theme-toggle');
const divider = document.getElementById('divider');
const statusWords = document.getElementById('status-words');
const statusChars = document.getElementById('status-chars');
const statusLines = document.getElementById('status-lines');

// Util: contadores
const updateStatus = (text) => {
    const words = (text.trim().match(/\S+/g) || []).length;
    const chars = text.length;
    const lines = text.split(/\n/).length;
    statusWords.textContent = `Palavras: ${words}`;
    statusChars.textContent = `Caracteres: ${chars}`;
    statusLines.textContent = `Linhas: ${lines}`;
};

// Renderização de Markdown com fallback web
const renderMarkdown = async (text) => {
    let htmlText = '';
    if (window.electronAPI?.markdownToHtml) {
        htmlText = await window.electronAPI.markdownToHtml(text);
    } else if (window.marked) {
        // Fallback web (sem Electron)
        window.marked.setOptions({
            gfm: true,
            breaks: true
        });
        htmlText = window.marked.parse(text || '');
    } else {
        htmlText = '<p>Renderer indisponível.</p>';
    }
    htmlOutput.innerHTML = htmlText;
    if (window.hljs) {
        window.hljs.highlightAll();
    }
    updateStatus(text || '');
    try {
        localStorage.setItem('md_content', text || '');
    } catch {}
};

// Entrada de texto
markdownInput.addEventListener('input', (event) => {
    renderMarkdown(event.target.value);
});

// Restaurar rascunho
(() => {
    try {
        const draft = localStorage.getItem('md_content');
        if (draft) {
            markdownInput.value = draft;
            renderMarkdown(draft);
        }
    } catch {}
})();

// Conteúdo vindo do processo principal
if (window.electronAPI?.onFileContent) {
    window.electronAPI.onFileContent((content) => {
        markdownInput.value = content;
        renderMarkdown(content);
    });
}

// Salvar via menu (trigger-save)
if (window.electronAPI?.onTriggerSave) {
    window.electronAPI.onTriggerSave(async () => {
        const content = markdownInput.value;
        const result = await window.electronAPI.saveFile(content);
        if (result.success) {
            console.log(`Arquivo salvo com sucesso em: ${result.path}`);
        } else {
            console.error(`Falha ao salvar o arquivo: ${result.reason}`);
        }
    });
}

// Triggers de exportação via menu
if (window.electronAPI?.onTriggerExportHtml) {
    window.electronAPI.onTriggerExportHtml(async () => {
        const text = markdownInput.value;
        const result = await window.electronAPI.exportHtml(text);
        if (!result.success) alert(`Erro ao exportar HTML: ${result.reason}`);
    });
}
if (window.electronAPI?.onTriggerExportPdf) {
    window.electronAPI.onTriggerExportPdf(async () => {
        const html = htmlOutput.innerHTML;
        const result = await window.electronAPI.exportPdf(html);
        if (!result.success) alert(`Erro ao exportar PDF: ${result.reason}`);
    });
}

// Tema via menu
if (window.electronAPI?.onSetTheme) {
    window.electronAPI.onSetTheme((theme) => {
        themeToggle.value = theme;
        applyTheme(theme);
        try { localStorage.setItem('theme', theme); } catch {}
    });
}

// Toolbar: Abrir/Salvar/Exportar
btnOpen.addEventListener('click', async () => {
    if (window.electronAPI?.openDialog) {
        const res = await window.electronAPI.openDialog();
        if (res?.success) {
            markdownInput.value = res.content;
            renderMarkdown(res.content);
        }
    } else {
        alert('Abrir arquivo só funciona no modo Electron.');
    }
});

btnSave.addEventListener('click', async () => {
    if (window.electronAPI?.saveFile) {
        const content = markdownInput.value;
        const result = await window.electronAPI.saveFile(content);
        if (!result.success) alert(`Erro ao salvar: ${result.reason}`);
    } else {
        // Fallback web: baixar arquivo
        const blob = new Blob([markdownInput.value], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'documento.md';
        a.click();
        URL.revokeObjectURL(a.href);
    }
});

btnExportHtml.addEventListener('click', async () => {
    const text = markdownInput.value;
    if (window.electronAPI?.exportHtml) {
        const result = await window.electronAPI.exportHtml(text);
        if (!result.success) alert(`Erro ao exportar HTML: ${result.reason}`);
    } else {
        const html = htmlOutput.innerHTML;
        const template = `<!doctype html><html><head><meta charset="utf-8"><title>Export</title></head><body>${html}</body></html>`;
        const blob = new Blob([template], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'documento.html';
        a.click();
        URL.revokeObjectURL(a.href);
    }
});

btnExportPdf.addEventListener('click', async () => {
    const html = htmlOutput.innerHTML;
    if (window.electronAPI?.exportPdf) {
        const result = await window.electronAPI.exportPdf(html);
        if (!result.success) alert(`Erro ao exportar PDF: ${result.reason}`);
    } else {
        alert('Exportar PDF requer Electron. Use Ctrl+P para imprimir.');
    }
});

// Tema
const applyTheme = (theme) => {
    if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.remove('theme-light');
    }
};
(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    themeToggle.value = saved;
    applyTheme(saved);
})();
themeToggle.addEventListener('change', (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    try { localStorage.setItem('theme', theme); } catch {}
});

// Divisor redimensionável
(() => {
    let dragging = false;
    const container = document.querySelector('.container');
    const startDrag = () => { dragging = true; document.body.style.cursor = 'col-resize'; };
    const stopDrag = () => { dragging = false; document.body.style.cursor = 'default'; };
    const onMove = (e) => {
        if (!dragging) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const total = rect.width;
        const left = Math.min(Math.max(x, 120), total - 120);
        container.style.gridTemplateColumns = `${left}px 8px 1fr`;
    };
    divider.addEventListener('mousedown', startDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mousemove', onMove);
})();

// Drag-and-drop para abrir arquivo (modo Electron)
document.addEventListener('dragover', (e) => { e.preventDefault(); });
document.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!e.dataTransfer || !e.dataTransfer.files?.length) return;
    const file = e.dataTransfer.files[0];
    if (window.electronAPI?.openByPath && file.path) {
        const res = await window.electronAPI.openByPath(file.path);
        if (res?.success) {
            markdownInput.value = res.content;
            renderMarkdown(res.content);
        } else if (res?.reason) {
            alert(res.reason);
        }
    }
});

// Inicializa com conteúdo vazio
if (!markdownInput.value) {
    renderMarkdown('');
}

// Atalhos de teclado adicionais
window.addEventListener('keydown', async (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const text = markdownInput.value;
        if (window.electronAPI?.exportHtml) {
            const result = await window.electronAPI.exportHtml(text);
            if (!result.success) alert(`Erro ao exportar HTML: ${result.reason}`);
        }
    }
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const html = htmlOutput.innerHTML;
        if (window.electronAPI?.exportPdf) {
            const result = await window.electronAPI.exportPdf(html);
            if (!result.success) alert(`Erro ao exportar PDF: ${result.reason}`);
        }
    }
    if (ctrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const next = themeToggle.value === 'dark' ? 'light' : 'dark';
        themeToggle.value = next;
        const apply = next;
        if (apply === 'light') document.body.classList.add('theme-light');
        else document.body.classList.remove('theme-light');
        try { localStorage.setItem('theme', apply); } catch {}
    }
});