const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { createDocumentController } = require('../controllers/document.controller');

function createDocumentRoutes(service, { storageDirectory, maxFileSize }) {
  const router = express.Router();
  fs.mkdirSync(storageDirectory, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: storageDirectory,
      filename: (request, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: maxFileSize },
  });
  const controller = createDocumentController(service);

  router.post('/upload', upload.single('file'), controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);
  return router;
}

module.exports = createDocumentRoutes;