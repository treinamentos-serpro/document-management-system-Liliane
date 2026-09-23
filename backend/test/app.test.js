const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;
let storageDirectory;

before(async () => {
  storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-ci-'));
  server = http.createServer(app.createApp({ storageDirectory }));
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

function headers(owner) {
  return { 'X-User-Id': owner };
}

test('o backend exporta o app e responde ao health check', async () => {
  assert.equal(typeof app, 'function');
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
});

test('POST /upload cria um documento', async () => {
  const form = new FormData();
  form.append('file', new File(['conteudo'], 'nota.txt', { type: 'text/plain' }));
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', headers: headers('user-a'), body: form });
  assert.equal(response.status, 201);
  const document = await response.json();
  assert.equal(document.originalName, 'nota.txt');
  assert.equal(document.size, 8);
  assert.equal(document.owner, 'user-a');
});

test('GET /documents lista somente os documentos do usuário', async () => {
  const response = await fetch(`${baseUrl}/documents`, { headers: headers('user-a') });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.documents.length, 1);
  assert.equal(body.documents[0].owner, 'user-a');

  const otherResponse = await fetch(`${baseUrl}/documents`, { headers: headers('user-b') });
  assert.deepEqual((await otherResponse.json()).documents, []);
});

test('GET /documents/:id/download retorna o conteúdo do documento', async () => {
  const listResponse = await fetch(`${baseUrl}/documents`, { headers: headers('user-a') });
  const [document] = (await listResponse.json()).documents;
  const response = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers: headers('user-a') });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'conteudo');
  assert.match(response.headers.get('content-disposition'), /nota\.txt/);
});

test('download rejeita outro proprietário', async () => {
  const listResponse = await fetch(`${baseUrl}/documents`, { headers: headers('user-a') });
  const [document] = (await listResponse.json()).documents;
  const response = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers: headers('user-b') });
  assert.equal(response.status, 403);
});
