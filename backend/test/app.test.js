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
  storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  server = http.createServer(app.createApp({ storageDirectory, maxFileSize: 1024 }));
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

function userHeaders(owner) {
  return { 'X-User-Id': owner };
}

async function uploadFile(owner, content = 'conteúdo de teste', name = 'nota.txt') {
  const form = new FormData();
  form.append('file', new File([content], name, { type: 'text/plain' }));
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: userHeaders(owner),
    body: form,
  });
}

test('o app backend é exportado e responde ao health check', async () => {
  assert.equal(typeof app, 'function');
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('faz upload, lista e baixa um documento', async () => {
  const uploadResponse = await uploadFile('user-a');
  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();

  const listResponse = await fetch(`${baseUrl}/documents`, { headers: userHeaders('user-a') });
  assert.deepEqual((await listResponse.json()).documents.map((item) => item.id), [document.id]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: userHeaders('user-a'),
  });
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteúdo de teste');
});

test('isola documentos entre usuários', async () => {
  const document = await (await uploadFile('owner')).json();

  const listResponse = await fetch(`${baseUrl}/documents`, { headers: userHeaders('other') });
  assert.deepEqual((await listResponse.json()).documents, []);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: userHeaders('other'),
  });
  assert.equal(downloadResponse.status, 403);
});

test('rejeita upload sem arquivo e remove arquivo acima do limite', async () => {
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: userHeaders('user-a'),
  });
  assert.equal(missingFileResponse.status, 400);

  const filesBeforeLargeUpload = await fs.readdir(storageDirectory);
  const largeResponse = await uploadFile('user-a', 'x'.repeat(2048), 'large.txt');
  assert.equal(largeResponse.status, 413);
  assert.deepEqual(await fs.readdir(storageDirectory), filesBeforeLargeUpload);
});

test('remove arquivos sem metadados ao iniciar uma nova instância', async () => {
  const orphanStorageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-orphan-test-'));
  const firstApp = app.createApp({ storageDirectory: orphanStorageDirectory, maxFileSize: 1024 });
  const firstServer = http.createServer(firstApp);
  await new Promise((resolve) => firstServer.listen(0, resolve));
  const firstUrl = `http://localhost:${firstServer.address().port}`;
  const form = new FormData();
  form.append('file', new File(['órfão'], 'orphan.txt', { type: 'text/plain' }));
  const uploadResponse = await fetch(`${firstUrl}/upload`, {
    method: 'POST',
    headers: userHeaders('user-a'),
    body: form,
  });
  const firstDocument = await uploadResponse.json();
  assert.ok(firstDocument.id);
  assert.equal((await fs.readdir(orphanStorageDirectory)).length, 1);
  await new Promise((resolve) => firstServer.close(resolve));

  const secondApp = app.createApp({ storageDirectory: orphanStorageDirectory, maxFileSize: 1024 });
  const secondServer = http.createServer(secondApp);
  await new Promise((resolve) => secondServer.listen(0, resolve));
  const secondUrl = `http://localhost:${secondServer.address().port}`;

  const listResponse = await fetch(`${secondUrl}/documents`, { headers: userHeaders('user-a') });
  assert.deepEqual((await listResponse.json()).documents, []);
  assert.deepEqual(await fs.readdir(orphanStorageDirectory), []);

  await new Promise((resolve) => secondServer.close(resolve));
  await fs.rm(orphanStorageDirectory, { recursive: true, force: true });
});
