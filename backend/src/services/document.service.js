const crypto = require('node:crypto');

function serviceError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function publicDocument({ id, originalName, size, mimeType, uploadedAt, owner }) {
  return { id, originalName, size, mimeType, uploadedAt, owner };
}

class DocumentService {
  constructor(repository, { maxFileSize }) {
    this.repository = repository;
    this.maxFileSize = maxFileSize;
  }

  async upload(file, owner) {
    if (!owner) throw serviceError('USER_REQUIRED', 'O cabeçalho X-User-Id é obrigatório.', 400);
    if (!file) throw serviceError('FILE_REQUIRED', 'É necessário enviar um arquivo.', 400);
    if (file.size > this.maxFileSize) {
      await this.removeUploadedFile(file);
      throw serviceError('FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.', 413);
    }

    const document = {
      id: crypto.randomUUID(),
      originalName: file.originalname,
      storedName: file.filename,
      storagePath: file.path,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
      owner,
    };

    try {
      this.repository.save(document);
      return publicDocument(document);
    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }
  }

  list(owner) {
    return this.repository.findByOwner(owner).map(publicDocument);
  }

  async download(id, owner) {
    const document = this.repository.findById(id);
    if (!document) throw serviceError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
    if (document.owner !== owner) throw serviceError('DOCUMENT_FORBIDDEN', 'Você não tem acesso a este documento.', 403);

    try {
      return { document: publicDocument(document), content: await this.repository.readFile(document.storagePath) };
    } catch (error) {
      if (error.code === 'ENOENT') throw serviceError('FILE_NOT_FOUND', 'Arquivo do documento não encontrado.', 404);
      throw error;
    }
  }

  async removeUploadedFile(file) {
    if (file?.path) await this.repository.removeFile(file.path);
  }
}

module.exports = DocumentService;