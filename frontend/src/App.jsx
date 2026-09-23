import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import { listDocuments, uploadDocument } from './services/documentService';
import './App.css';

export default function App() {
  const [owner, setOwner] = useState('demo-user');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      setIsLoading(true);
      setError('');
      try {
        const items = await listDocuments(owner);
        if (isCurrent) setDocuments(items);
      } catch (requestError) {
        if (isCurrent) setError(requestError.message);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    if (owner.trim()) {
      loadDocuments();
    } else {
      setDocuments([]);
      setIsLoading(false);
    }

    return () => {
      isCurrent = false;
    };
  }, [owner]);

  async function handleUpload(file) {
    setMessage('');
    setError('');
    try {
      const document = await uploadDocument(file, owner);
      setDocuments((currentDocuments) => [document, ...currentDocuments]);
      setMessage('Documento enviado com sucesso.');
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM</p>
        <h1>Seus documentos, em um só lugar.</h1>
        <p className="subtitle">Envie, consulte e baixe seus arquivos armazenados localmente.</p>
      </header>

      <section className="workspace" aria-label="Gestão de documentos">
        <label className="owner-field">
          Identificador do usuário
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Ex.: maria-123"
          />
        </label>

        <UploadComponent disabled={!owner.trim()} onUpload={handleUpload} />

        {message && <p className="feedback success" role="status">{message}</p>}
        {error && <p className="feedback error" role="alert">{error}</p>}

        <section className="documents-section" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ARQUIVOS DISPONÍVEIS</p>
              <h2 id="documents-title">Documentos</h2>
            </div>
            <span className="document-count">{documents.length}</span>
          </div>

          {isLoading ? (
            <p className="empty-state">Carregando documentos...</p>
          ) : (
            <DocumentList documents={documents} owner={owner} />
          )}
        </section>
      </section>
    </main>
  );
}
