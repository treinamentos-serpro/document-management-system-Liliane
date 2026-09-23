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

async function startTestServer(storageDirectory, maxFileSize = 1024) {
  const testApp = app.createApp({ storageDirectory, maxFileSize });
  const testServer = http.createServer(testApp);
  await new Promise((resolve) => testServer.listen(0, resolve));

  return {
    server: testServer,
    baseUrl: `http://localhost:${testServer.address().port}`,
  };
}

async function stopTestServer(testServer) {
  await new Promise((resolve) => testServer.close(resolve));
}

before(async () => {
  storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  ({ server, baseUrl } = await startTestServer(storageDirectory));
});

after(async () => {
  await stopTestServer(server);
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
  assert.match(downloadResponse.headers.get('content-disposition'), /nota\.txt/);
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

test('mantém arquivos no disco mesmo quando os metadados reiniciam', async () => {
  const orphanStorageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-orphan-test-'));
  const firstInstance = await startTestServer(orphanStorageDirectory);
  const form = new FormData();
  form.append('file', new File(['órfão'], 'orphan.txt', { type: 'text/plain' }));
  const uploadResponse = await fetch(`${firstInstance.baseUrl}/upload`, {
    method: 'POST',
    headers: userHeaders('user-a'),
    body: form,
  });
  const firstDocument = await uploadResponse.json();
  assert.ok(firstDocument.id);
  assert.equal((await fs.readdir(orphanStorageDirectory)).length, 1);
  await stopTestServer(firstInstance.server);

  const secondInstance = await startTestServer(orphanStorageDirectory);

  const listResponse = await fetch(`${secondInstance.baseUrl}/documents`, { headers: userHeaders('user-a') });
  assert.deepEqual((await listResponse.json()).documents, []);
  assert.equal((await fs.readdir(orphanStorageDirectory)).length, 1);

  await stopTestServer(secondInstance.server);
  await fs.rm(orphanStorageDirectory, { recursive: true, force: true });
});
