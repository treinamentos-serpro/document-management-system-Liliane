function getOwner(request) {
  const owner = request.get('X-User-Id');
  if (!owner || owner.length > 100) {
    const error = new Error('O cabeçalho X-User-Id é obrigatório.');
    error.code = 'USER_REQUIRED';
    error.status = 400;
    throw error;
  }
  return owner;
}

function createDocumentController(service) {
  return {
    upload: async (request, response, next) => {
      try {
        const owner = getOwner(request);
        response.status(201).json(await service.upload(request.file, owner));
      } catch (error) {
        if (request.file?.path) {
          await service.removeUploadedFile(request.file);
        }
        next(error);
      }
    },

    list: async (request, response, next) => {
      try {
        response.json({ documents: await service.list(getOwner(request)) });
      } catch (error) {
        next(error);
      }
    },

    download: async (request, response, next) => {
      try {
        const result = await service.download(request.params.id, getOwner(request));
        response.type(result.document.mimeType || 'application/octet-stream');
        response.attachment(result.document.originalName);
        response.send(result.content);
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = { createDocumentController };