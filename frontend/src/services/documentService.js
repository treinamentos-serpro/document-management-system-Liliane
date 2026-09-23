const API_PREFIX = '/api';

async function getErrorMessage(response) {
  const responseText = await response.text().catch(() => '');
  try {
    const body = JSON.parse(responseText);
    return body?.error?.message || `A operação falhou (HTTP ${response.status}).`;
  } catch {
    return `A operação falhou (HTTP ${response.status}). Verifique se o backend está em execução.`;
  }
}

async function ensureSuccess(response) {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return response;
}

function userHeaders(owner) {
  return { 'X-User-Id': owner };
}

export async function listDocuments(owner) {
  const response = await ensureSuccess(await fetch(`${API_PREFIX}/documents`, {
    headers: userHeaders(owner),
  }));
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await ensureSuccess(await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    headers: userHeaders(owner),
    body: formData,
  }));
  return response.json();
}

export async function downloadDocument(id, owner) {
  return ensureSuccess(await fetch(`${API_PREFIX}/documents/${encodeURIComponent(id)}/download`, {
    headers: userHeaders(owner),
  }));
}