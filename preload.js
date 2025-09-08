// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    markdownToHtml: (markdown) => ipcRenderer.invoke('markdown:to-html', markdown),

    // Função para receber o conteúdo do arquivo aberto
    onFileContent: (callback) => ipcRenderer.on('file-content', (event, content) => callback(content)),

    // Fnção para ouvir o gatilho de salvar
    onTriggerSave: (callback) => ipcRenderer.on('trigger-save', callback),

    // Função para enviar o conteúdo para ser salvo
    saveFile: (content) => ipcRenderer.invoke('file:save', content)
});