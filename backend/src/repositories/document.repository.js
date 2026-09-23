const fs = require('node:fs/promises');

class DocumentRepository {
  constructor(storageDirectory) {
    this.storageDirectory = storageDirectory;
    this.documents = new Map();
    this.ready = this.initialize();
  }

  async initialize() {
    await fs.mkdir(this.storageDirectory, { recursive: true });
    const entries = await fs.readdir(this.storageDirectory, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() || entry.isSymbolicLink())
        .map((entry) => fs.rm(`${this.storageDirectory}/${entry.name}`, { force: true })),
    );
  }

  async save(document) {
    await this.ready;
    this.documents.set(document.id, document);
    return document;
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
    return fs.readFile(storagePath);
  }

  async removeFile(storagePath) {
    await this.ready;
    await fs.rm(storagePath, { force: true });
  }
}

module.exports = DocumentRepository;
