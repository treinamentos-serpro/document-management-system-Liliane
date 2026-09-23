# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem, consultem e baixem documentos armazenados localmente, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos.
- Armazenamento dos arquivos no filesystem local.
- Listagem de documentos do usuário.
- Download de documentos pelo identificador.
- Gestão simples por usuário.
- Interface web em React.
- API REST em Node.js e Express.
- Tratamento de erros de entrada, arquivos inexistentes e identificadores inválidos.
- Testes automatizados dos principais fluxos da API.

### Fora do escopo

- Armazenamento em nuvem ou serviços externos.
- Banco de dados persistente.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Autenticação completa ou gerenciamento de senhas.
- Busca textual, pré-visualização ou conversão de documentos.
- Auditoria persistente, filas e processamento assíncrono.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário deve conseguir enviar um documento por `multipart/form-data`. |
| RF-02 | O sistema deve aceitar exatamente um arquivo no campo `file` por requisição. |
| RF-03 | O arquivo deve ser gravado em `STORAGE_DIR` usando `multer` com `diskStorage`. |
| RF-04 | O sistema deve gerar um identificador único para cada documento. |
| RF-05 | O sistema deve registrar os metadados do documento em memória. |
| RF-06 | O usuário deve conseguir listar seus próprios documentos. |
| RF-07 | A listagem deve ser ordenada do mais recente para o mais antigo. |
| RF-08 | O usuário deve conseguir baixar um documento pelo identificador. |
| RF-09 | O sistema deve impedir o download de documentos pertencentes a outro usuário. |
| RF-10 | O sistema deve informar erros para usuário ausente, arquivo ausente, arquivo grande ou documento inexistente. |
| RF-11 | O frontend deve permitir selecionar e enviar um documento. |
| RF-12 | O frontend deve exibir carregamento, lista vazia, sucesso e erros. |
| RF-13 | O frontend deve listar os metadados dos documentos disponíveis. |
| RF-14 | O frontend deve disponibilizar uma ação de download para cada documento. |
| RF-15 | O usuário deve ser identificado pelo cabeçalho `X-User-Id`, sem autenticação completa nesta fase. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend deve utilizar Node.js, Express e CommonJS. |
| RNF-02 | O frontend deve utilizar React, Vite e ESM. |
| RNF-03 | O armazenamento dos arquivos deve ser exclusivamente local. |
| RNF-04 | O upload deve utilizar `multer.diskStorage`. |
| RNF-05 | Os metadados devem permanecer em memória nesta primeira versão. |
| RNF-06 | Os metadados serão perdidos quando o processo do backend for reiniciado. |
| RNF-07 | O diretório de armazenamento deve ser configurável por `STORAGE_DIR`. |
| RNF-08 | A porta do backend deve ser configurável por `PORT`. |
| RNF-09 | O tamanho máximo do arquivo deve ser configurável por `MAX_FILE_SIZE_BYTES`. |
| RNF-10 | O backend deve respeitar o fluxo `routes -> controllers -> services -> repositories`. |
| RNF-11 | Controllers devem tratar HTTP, services devem concentrar regras de negócio e repositories devem tratar persistência. |
| RNF-12 | O frontend deve consumir a API por meio do prefixo `/api`. |
| RNF-13 | O proxy de desenvolvimento do Vite deve encaminhar `/api` para o backend. |
| RNF-14 | A API deve retornar JSON para respostas de sucesso ou erro, exceto no download. |
| RNF-15 | A API não deve expor caminhos físicos nem confiar no nome original para definir o nome armazenado. |
| RNF-16 | A solução não deve depender de serviços externos de armazenamento. |

## 5. Modelo de dados

### 5.1 Documento interno

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, preferencialmente UUID. |
| `originalName` | string | Sim | Nome original informado pelo cliente. |
| `storedName` | string | Sim | Nome seguro usado no filesystem. |
| `storagePath` | string | Sim | Caminho interno do arquivo armazenado. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `mimeType` | string | Sim | Tipo MIME do arquivo. |
| `uploadedAt` | string | Sim | Data e hora do upload em ISO 8601. |
| `owner` | string | Sim | Identificador obtido de `X-User-Id`. |

`storedName` e `storagePath` são propriedades internas e não devem ser expostas pela API.

### 5.2 Representação pública

```json
{
  "id": "uuid",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "mimeType": "application/pdf",
  "uploadedAt": "2026-09-23T12:00:00.000Z",
  "owner": "user-123"
}
```

### 5.3 Regras de dados

- `id` deve ser único durante a execução do processo.
- `originalName` não pode ser vazio.
- `size` deve ser maior que zero.
- `owner` deve vir do contexto da requisição, nunca do corpo enviado pelo cliente.
- O arquivo físico deve ser associado ao metadado criado.
- A listagem deve retornar somente documentos do usuário atual.
- O download deve validar a existência do documento e sua propriedade.
- O nome físico deve ser gerado pelo sistema para evitar conflitos e path traversal.

## 6. Contratos de API

As rotas de documentos devem receber o cabeçalho:

```http
X-User-Id: user-123
```

O identificador deve ser uma string não vazia.

### 6.1 GET `/health`

Endpoint técnico de verificação do backend.

Resposta `200 OK`:

```json
{
  "status": "ok"
}
```

### 6.2 POST `/upload`

Envia um documento.

#### Requisição

```http
POST /upload
Content-Type: multipart/form-data
X-User-Id: user-123
```

O campo multipart obrigatório é `file`.

#### Resposta de sucesso

Status: `201 Created`

```json
{
  "id": "uuid",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "mimeType": "application/pdf",
  "uploadedAt": "2026-09-23T12:00:00.000Z",
  "owner": "user-123"
}
```

#### Erros

- `400 Bad Request`: usuário ou arquivo ausente.
- `413 Payload Too Large`: arquivo acima do limite configurado.
- `500 Internal Server Error`: falha ao armazenar o arquivo ou registrar os metadados.

### 6.3 GET `/documents`

Lista os documentos do usuário atual.

#### Requisição

```http
GET /documents
X-User-Id: user-123
```

#### Resposta de sucesso

Status: `200 OK`

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-09-23T12:00:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Quando não houver documentos, deve retornar `{ "documents": [] }`.

### 6.4 GET `/documents/:id/download`

Baixa o arquivo associado ao documento.

#### Requisição

```http
GET /documents/uuid/download
X-User-Id: user-123
```

#### Resposta de sucesso

Status: `200 OK`, com:

- Corpo binário do arquivo.
- `Content-Type` correspondente ao `mimeType`.
- `Content-Disposition` usando o nome original.

#### Erros

- `400 Bad Request`: identificador inválido.
- `403 Forbidden`: documento pertence a outro usuário.
- `404 Not Found`: documento ou arquivo físico não encontrado.
- `500 Internal Server Error`: falha na leitura do arquivo.

### 6.5 Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

## 7. Organização arquitetural

### 7.1 Rotas - `backend/src/routes/`

- Registrar endpoints.
- Configurar o middleware do `multer`.
- Encaminhar requisições aos controllers.
- Não conter regras de negócio.

### 7.2 Controllers - `backend/src/controllers/`

- Ler headers, parâmetros e arquivos.
- Fazer validações básicas de entrada.
- Chamar os services.
- Traduzir resultados para respostas HTTP.
- Encaminhar erros ao tratamento centralizado.

### 7.3 Services - `backend/src/services/`

- Aplicar regras de upload, listagem e download.
- Associar documentos aos usuários.
- Validar propriedade do documento.
- Coordenar repository e filesystem.
- Não depender de objetos específicos do Express.

### 7.4 Repositories - `backend/src/repositories/`

- Manter metadados em memória.
- Isolar operações do filesystem local.
- Buscar documentos por identificador e usuário.
- Ler e remover arquivos quando necessário.

### 7.5 Frontend

- `frontend/src/services/`: chamadas `fetch` para `/api`.
- `frontend/src/components/`: upload, listagem e download.
- `frontend/src/pages/`: composição das telas.
- `frontend/src/App.jsx`: composição principal da aplicação.

## 8. Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos. |
| `MAX_FILE_SIZE_BYTES` | Definido na implementação | Limite máximo por arquivo. |

O frontend deve utilizar `/api`, com o proxy do Vite encaminhando as requisições para o backend local.

## 9. Plano de execução

### Etapa 1 - Estrutura inicial do backend

- Configurar Express, variáveis de ambiente e diretório local.
- Definir repository de metadados em memória.
- Manter o endpoint `/health` funcionando.

### Etapa 2 - Upload

- Configurar `multer.diskStorage`.
- Validar `X-User-Id` e o campo `file`.
- Persistir arquivo e metadados.
- Tratar limites e falhas de armazenamento.

### Etapa 3 - Listagem

- Implementar `GET /documents`.
- Filtrar documentos pelo usuário.
- Ordenar por data decrescente.
- Retornar somente campos públicos.

### Etapa 4 - Download

- Implementar `GET /documents/:id/download`.
- Validar identificador e proprietário.
- Verificar o arquivo físico.
- Enviar o conteúdo com headers apropriados.

### Etapa 5 - Interface frontend

- Criar serviço `fetch`.
- Implementar seleção e upload.
- Exibir lista, estados vazios e erros.
- Implementar ação de download.

### Etapa 6 - Testes

- Testar health check.
- Testar upload válido e inválido.
- Testar listagem e isolamento entre usuários.
- Testar download válido e documentos inexistentes.
- Testar limite de tamanho e limpeza de arquivos temporários.

### Etapa 7 - Validação

- Executar `npm test` no backend.
- Executar `npm run build` no frontend.
- Validar o proxy `/api`.
- Validar o fluxo completo de upload, listagem e download.

## 10. Critérios de conclusão

- Upload, listagem e download funcionam de ponta a ponta.
- Os arquivos ficam exclusivamente no filesystem local.
- Os metadados ficam em memória.
- Usuários não acessam documentos de outros usuários.
- A separação `routes -> controllers -> services -> repositories` é respeitada.
- Backend e frontend iniciam com as configurações documentadas.
- Os principais casos de sucesso e erro possuem testes automatizados.
