// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    markdownToHtml: (markdown) => ipcRenderer.invoke('markdown:to-html', markdown),

    // Função para receber o conteúdo do arquivo aberto
    onFileContent: (callback) => ipcRenderer.on('file-content', (event, content) => callback(content)),

    // Fnção para ouvir o gatilho de salvar
    onTriggerSave: (callback) => ipcRenderer.on('trigger-save', callback),

    // Ouvir tema vindo do menu
    onSetTheme: (callback) => ipcRenderer.on('set-theme', (_e, theme) => callback(theme)),

    // Ouvir triggers de exportação via menu
    onTriggerExportHtml: (callback) => ipcRenderer.on('trigger-export-html', callback),
    onTriggerExportPdf: (callback) => ipcRenderer.on('trigger-export-pdf', callback),

    // Função para enviar o conteúdo para ser salvo
    saveFile: (content) => ipcRenderer.invoke('file:save', content),

    // Abrir via diálogo do sistema
    openDialog: () => ipcRenderer.invoke('file:open-dialog'),

    // Exportar HTML
    exportHtml: (markdownText) => ipcRenderer.invoke('file:export-html', markdownText),

    // Exportar PDF (a partir do HTML do preview)
    exportPdf: (htmlContent) => ipcRenderer.invoke('file:export-pdf', htmlContent),

    // Abrir arquivo por caminho (drag-and-drop)
    openByPath: (filePath) => ipcRenderer.invoke('file:open-path', filePath)
});