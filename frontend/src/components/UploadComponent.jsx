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
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">NOVO DOCUMENTO</p>
        <h2>Envie um arquivo</h2>
        <p className="muted">O arquivo será armazenado no filesystem local.</p>
      </div>
      <label className="file-picker">
        <span>{file ? file.name : 'Escolher arquivo'}</span>
        <input
          type="file"
          disabled={disabled || isUploading}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <button type="submit" disabled={!file || disabled || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}