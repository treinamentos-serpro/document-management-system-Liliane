const crypto = require('node:crypto');

function createServiceError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function validateUpload(file, owner, maxFileSize) {
  if (!owner) {
    throw createServiceError('USER_REQUIRED', 'O cabeçalho X-User-Id é obrigatório.', 400);
  }

  if (!file) {
    throw createServiceError('FILE_REQUIRED', 'É necessário enviar um arquivo.', 400);
  }

  if (file.size > maxFileSize) {
    throw createServiceError('FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.', 413);
  }
}

function createDocumentMetadata(file, owner) {
  return {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    storedName: file.filename,
    storagePath: file.path,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
    owner,
  };
}

function toPublicDocument({ id, originalName, size, mimeType, uploadedAt, owner }) {
  return { id, originalName, size, mimeType, uploadedAt, owner };
}

class DocumentService {
  constructor(repository, { maxFileSize }) {
    this.repository = repository;
    this.maxFileSize = maxFileSize;
  }

  async upload(file, owner) {
    try {
      validateUpload(file, owner, this.maxFileSize);
    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }

    const document = createDocumentMetadata(file, owner);

    try {
      await this.repository.save(document);
    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }

    return toPublicDocument(document);
  }

  async list(owner) {
    const documents = await this.repository.findByOwner(owner);
    return documents.map(toPublicDocument);
  }

  async download(id, owner) {
    const document = await this.findOwnedDocument(id, owner);

    try {
      return {
        document: toPublicDocument(document),
        content: await this.repository.readFile(document.storagePath),
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createServiceError('FILE_NOT_FOUND', 'Arquivo do documento não encontrado.', 404);
      }
      throw error;
    }
  }

  async findOwnedDocument(id, owner) {
    const document = await this.repository.findById(id);
    if (!document) {
      throw createServiceError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
    }

    if (document.owner !== owner) {
      throw createServiceError('DOCUMENT_FORBIDDEN', 'Você não tem acesso a este documento.', 403);
    }

    return document;
  }

  async removeUploadedFile(file) {
    if (file?.path) {
      await this.repository.removeFile(file.path);
    }
  }
}

module.exports = DocumentService;
