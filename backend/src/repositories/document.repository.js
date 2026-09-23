const fs = require('node:fs/promises');
const path = require('node:path');

class DocumentRepository {
  constructor(storageDirectory) {
    this.storageDirectory = path.resolve(storageDirectory);
    this.documents = new Map();
    this.ready = this.initialize();
  }

  async initialize() {
    await fs.mkdir(this.storageDirectory, { recursive: true });
  }

  resolveStoragePath(storagePath) {
    const resolvedStoragePath = path.resolve(storagePath);
    const relativeStoragePath = path.relative(this.storageDirectory, resolvedStoragePath);

    if (relativeStoragePath.startsWith('..') || path.isAbsolute(relativeStoragePath)) {
      const error = new Error('Caminho de arquivo inválido.');
      error.code = 'INVALID_STORAGE_PATH';
      error.status = 500;
      throw error;
    }

    return resolvedStoragePath;
  }

  async save(document) {
    await this.ready;
    const normalizedDocument = {
      ...document,
      storagePath: this.resolveStoragePath(document.storagePath),
    };
    this.documents.set(normalizedDocument.id, normalizedDocument);
    return normalizedDocument;
  }

  async findById(id) {
    await this.ready;
    return this.documents.get(id);
  }

  async findByOwner(owner) {
    await this.ready;
    return [...this.documents.values()]
      .filter((document) => document.owner === owner)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
  }

  async readFile(storagePath) {
    await this.ready;
    return fs.readFile(this.resolveStoragePath(storagePath));
  }

  async removeFile(storagePath) {
    await this.ready;
    await fs.rm(this.resolveStoragePath(storagePath), { force: true });
  }
}

module.exports = DocumentRepository;
