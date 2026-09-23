const crypto = require('node:crypto');

class DocumentService {
  constructor(repository, { maxFileSize }) {
    this.repository = repository;
    this.maxFileSize = maxFileSize;
  }

  async upload(file, owner) {
    if (!owner) {
      await this.removeUploadedFile(file);
      throw this.createError('USER_REQUIRED', 'O cabeçalho X-User-Id é obrigatório.', 400);
    }

    if (!file) {
      throw this.createError('FILE_REQUIRED', 'É necessário enviar um arquivo.', 400);
    }

    if (file.size > this.maxFileSize) {
      await this.removeUploadedFile(file);
      throw this.createError('FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.', 413);
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
    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }

    return this.toPublicDocument(document);
  }

  list(owner) {
    return this.repository.findByOwner(owner).map((document) => this.toPublicDocument(document));
  }

  async download(id, owner) {
    const document = this.repository.findById(id);
    if (!document) {
      throw this.createError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
    }

    if (document.owner !== owner) {
      throw this.createError('DOCUMENT_FORBIDDEN', 'Você não tem acesso a este documento.', 403);
    }

    try {
      return {
        document: this.toPublicDocument(document),
        content: await this.repository.readFile(document.storagePath),
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw this.createError('FILE_NOT_FOUND', 'Arquivo do documento não encontrado.', 404);
      }
      throw error;
    }
  }

  async removeUploadedFile(file) {
    if (file?.path) {
      await this.repository.removeFile(file.path);
    }
  }

  createError(code, message, status) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
  }

  toPublicDocument({ id, originalName, size, mimeType, uploadedAt, owner }) {
    return { id, originalName, size, mimeType, uploadedAt, owner };
  }
}

module.exports = DocumentService;