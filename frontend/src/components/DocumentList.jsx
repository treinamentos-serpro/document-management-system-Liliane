import DownloadButton from './DownloadButton';

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export default function DocumentList({ documents, owner }) {
  if (!documents.length) {
    return <p className="empty-state">Nenhum documento enviado ainda.</p>;
  }

  return (
    <div className="document-list">
      {documents.map((document) => (
        <article className="document-row" key={document.id}>
          <div className="document-icon" aria-hidden="true">DOC</div>
          <div className="document-details">
            <strong title={document.originalName}>{document.originalName}</strong>
            <span>{formatSize(document.size)} · {formatDate(document.uploadedAt)}</span>
          </div>
          <DownloadButton document={document} owner={owner} />
        </article>
      ))}
    </div>
  );
}