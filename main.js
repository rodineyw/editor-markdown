// main.js

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const logging = require('electron-log');
const { marked } = require('marked');

// Configuração do logging
logging.transports.file.level = 'info';
logging.info('Aplicação iniciando...');

// Configurações do marked (GFM, quebras de linha)
marked.setOptions({
    gfm: true,
    breaks: true
});

ipcMain.handle('markdown:to-html', (event, markdown) => {
    try {
        const html = marked(markdown || '');
        return html;
    } catch (error) {
        logging.error('Erro ao converter Markdown:', error);
        return 'Erro ao converter Markdown.';
    }
});

// Lógica para salvar arquivos
ipcMain.handle('file:save', async (event, content) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const { filePath, canceled } = await dialog.showSaveDialog(window, {
        title: 'Salvar arquivo',
        buttonLabel: 'Salvar',
        filters: [{ name: 'Arquivos Markdown', extensions: ['md']}]
    });

    if (canceled) {
        return { success: false, reason: 'Diálogo cancelado' };
    }

    try {
        fs.writeFileSync(filePath, content);
        return { success: true, path: filePath};
    } catch (error) {
        logging.error('Erro ao salvar arquivo:', error);
        return { success: false, reason: error.message};
    }
});

// Abrir via diálogo
ipcMain.handle('file:open-dialog', async () => {
    try {
        const { filePaths, canceled } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Arquivos Markdown', extensions: ['md'] }]
        });
        if (canceled || !filePaths?.length) return { success: false, reason: 'Cancelado' };
        const filePath = filePaths[0];
        logging.info(`Abrindo arquivo via diálogo: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, path: filePath, content };
    } catch (error) {
        logging.error('Erro ao abrir arquivo via diálogo:', error);
        return { success: false, reason: error.message };
    }
});

// Abrir por caminho (drag-and-drop)
ipcMain.handle('file:open-path', async (_event, filePath) => {
    try {
        logging.info(`Abrindo arquivo por caminho: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, path: filePath, content };
    } catch (error) {
        logging.error('Erro ao abrir por caminho:', error);
        return { success: false, reason: error.message };
    }
});

// Exportar HTML
ipcMain.handle('file:export-html', async (event, markdownText) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(window, {
            title: 'Exportar HTML',
            buttonLabel: 'Exportar',
            filters: [{ name: 'HTML', extensions: ['html'] }]
        });
        if (canceled) return { success: false, reason: 'Cancelado' };
        const htmlBody = marked(markdownText || '');
        const template = `<!doctype html><html><head><meta charset="utf-8"><title>Documento</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
        <style>body{font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; padding: 24px;}</style>
        </head><body>${htmlBody}</body></html>`;
        fs.writeFileSync(filePath, template);
        logging.info(`HTML exportado: ${filePath}`);
        return { success: true, path: filePath };
    } catch (error) {
        logging.error('Erro ao exportar HTML:', error);
        return { success: false, reason: error.message };
    }
});

// Exportar PDF usando uma janela offscreen
ipcMain.handle('file:export-pdf', async (event, htmlContent) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(window, {
            title: 'Exportar PDF',
            buttonLabel: 'Exportar',
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (canceled) return { success: false, reason: 'Cancelado' };

        const tempWin = new BrowserWindow({
            show: false,
            webPreferences: { sandbox: false }
        });
        await tempWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><title>PDF</title>
        <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css\" />
        <style>body{font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; padding: 24px;}</style>
        </head><body>${htmlContent}</body></html>`));

        const pdfBuffer = await tempWin.webContents.printToPDF({
            marginsType: 0,
            printBackground: true,
            pageSize: 'A4'
        });
        fs.writeFileSync(filePath, pdfBuffer);
        tempWin.destroy();
        logging.info(`PDF exportado: ${filePath}`);
        return { success: true, path: filePath };
    } catch (error) {
        logging.error('Erro ao exportar PDF:', error);
        return { success: false, reason: error.message };
    }
});

const createWindow = () => {
    logging.info('Criando a janela principal...');
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
           preload: path.join(__dirname, 'preload.js'),
           contextIsolation: true,
           nodeIntegration: false
        }
    });

    win.loadFile('index.html');
    logging.info('Arquivo index.html carregado.');
    // win.webContents.openDevTools();

    // Criação do template do menu
    const menuTemplate = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Abrir Arquivo',
                    accelerator: 'CmdOrCtrl+O',
                    async click() {
                        // Abre o dialogo de abrir arquivo
                        const { filePaths, canceled } = await dialog.showOpenDialog({
                            properties: ['openFile'],
                            filters: [{ name: 'Arquivos Markdown', extensions: ['md']}]
                        });

                        if (!canceled && filePaths.length > 0) {
                            const filePath = filePaths[0];
                            logging.info(`Tentando abrir o arquivo: ${filePath}`);
                            try {
                                const content = fs.readFileSync(filePath, 'utf-8');
                                logging.info('Arquivo lido com sucesso. Enviando para o renderer.');
                                win.webContents.send('file-content', content);
                            } catch (error) {
                                logging.error(`Erro ao ler o arquivo: ${filePath}`, error);
                                dialog.showErrorBox('Erro ao Abrir Arquivo', `Não foi possivel ler o arquivo:\n ${error.message}`);
                            }
                        }
                    }
                },
                {
                    label: 'Salvar Como...',
                    accelerator: 'CmdOrCtrl+S',
                    click() {
                        // Apenas envio um sinal para a janela pedindo o conteúdo para salvar
                        win.webContents.send('trigger-save');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exportar HTML',
                    click() { win.webContents.send('trigger-export-html'); }
                },
                {
                    label: 'Exportar PDF',
                    click() { win.webContents.send('trigger-export-pdf'); }
                },
                { type: 'separator'},
                { 
                    label: 'Sair',
                    role: 'quit'
                }
            ]
        },
        {
            label: 'Visual',
            submenu: [
                {
                    label: 'Tema Claro',
                    click() { win.webContents.send('set-theme', 'light'); }
                },
                {
                    label: 'Tema Escuro',
                    click() { win.webContents.send('set-theme', 'dark'); }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});