import { useState } from 'react';

export default function UploadComponent({ disabled = false, onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading || disabled) return;

    setIsUploading(true);
    try {
      await onUpload(file);
      setFile(null);
      event.target.reset();
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit} aria-labelledby="upload-title">
      <div className="upload-copy">
        <p className="eyebrow">NOVO DOCUMENTO</p>
        <h2 id="upload-title">Envie um arquivo</h2>
        <p className="muted">O arquivo será armazenado no filesystem local.</p>
      </div>
      <label className="file-picker" htmlFor="document-file">
        <span>{file ? file.name : 'Escolher arquivo'}</span>
        <input
          id="document-file"
          name="document-file"
          aria-label="Arquivo do documento"
          type="file"
          disabled={disabled || isUploading}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <button type="submit" disabled={!file || disabled || isUploading} aria-busy={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}