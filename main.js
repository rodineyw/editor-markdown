// main.js

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const logging = require('electron-log');
const { marked } = require('marked');

// Configuração do logging
logging.transports.file.level = 'info';
logging.info('QAplicação Iniciando...');

ipcMain.handle('markdown:to-html', (event, markdown) => {
    try {
        const html = marked(markdown);
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
        filters: [{ name: 'Arquivos Makdown', extensions: ['md']}]
    });

    if (canceled) {
        return { success: false, reason: 'Dialogo cancelado' };
    }

    try {
        fs.writeFileSync(filePath, content);
        return { success: true, path: filePath};
    } catch (error) {
        logging.error('Erro ao salvar arquivo:', error);
        return { success: false, reason: error.message};
    }
});

const createWindow = () => {
    logging.info('Criando a janela principal...');
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
           preload: path.join(__dirname, 'preload.js')
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

                            // Envia o conteudo do arquivo para o renderer
                            win.webContents.send('fie-content', content);
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
                { type: 'separator'},
                { 
                    label: 'Sair',
                    role: 'quit'
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platfoem !== 'darwin') {
        app.quit();
    }
});