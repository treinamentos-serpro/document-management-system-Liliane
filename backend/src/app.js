const express = require('express');
const path = require('node:path');
const documentRoutes = require('./routes/document.routes');
const DocumentRepository = require('./repositories/document.repository');
const DocumentService = require('./services/document.service');

function createApp() {
  const app = express();
  const storageDirectory = process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage');
  const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);
  const repository = new DocumentRepository(storageDirectory);
  const service = new DocumentService(repository, { maxFileSize });

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(documentRoutes(service, { storageDirectory, maxFileSize }));

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o tamanho máximo permitido.' },
      });
      return;
    }

    res.status(error.status || 500).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Ocorreu um erro interno.',
      },
    });
  });

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
