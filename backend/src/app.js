const express = require('express');
const path = require('node:path');
const documentRoutes = require('./routes/document.routes');
const DocumentRepository = require('./repositories/document.repository');
const DocumentService = require('./services/document.service');

function createApp({ storageDirectory, maxFileSize } = {}) {
  const app = express();
  const configuredStorage = storageDirectory || process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage');
  const configuredLimit = maxFileSize || Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);
  const repository = new DocumentRepository(configuredStorage);
  const service = new DocumentService(repository, { maxFileSize: configuredLimit });

  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(documentRoutes(service, { storageDirectory: configuredStorage, maxFileSize: configuredLimit }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || 500;
    const code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : error.code || 'INTERNAL_ERROR';
    res.status(status).json({ error: { code, message: error.message || 'Ocorreu um erro interno.' } });
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
