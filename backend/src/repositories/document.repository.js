const fs = require('node:fs/promises');

class DocumentRepository {
  constructor(storageDirectory) {
    this.storageDirectory = storageDirectory;
    this.documents = new Map();
  }

  save(document) {
    this.documents.set(document.id, document);
    return document;
  }

  findById(id) {
    return this.documents.get(id);
  }

  findByOwner(owner) {
    return [...this.documents.values()]
      .filter((document) => document.owner === owner)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
  }

  async readFile(storagePath) {
    return fs.readFile(storagePath);
  }

  async removeFile(storagePath) {
    await fs.rm(storagePath, { force: true });
  }
}

module.exports = DocumentRepository;