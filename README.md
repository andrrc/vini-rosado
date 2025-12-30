# Vini Rosado - Gerador de Copy

Projeto full stack para geração de copy para Shopee usando React, TypeScript, Tailwind CSS e Supabase.

## 🚀 Stack Tecnológica

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + Edge Functions)
- **Integrações**: Google Gemini API, Hotmart Webhook

## 📋 Pré-requisitos

- Node.js 18+ e npm
- Conta Supabase
- Google Gemini API Key
- Conta Hotmart (para webhook)

## 🛠️ Instalação

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Configure as variáveis de ambiente no Supabase:

No dashboard do Supabase, vá em Settings > Edge Functions e configure:

- `GEMINI_API_KEY`: Sua chave da API do Google Gemini
- `SUPABASE_SERVICE_ROLE_KEY`: Sua service role key (já existe por padrão)

## 🗄️ Banco de Dados

Execute as migrations na ordem:

1. `001_create_profiles_table.sql`
2. `002_create_generations_table.sql`
3. `003_add_admin_and_ban_fields.sql` (para painel administrativo)

Ou crie manualmente as tabelas no Supabase:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## 🚀 Executando o Projeto

### Desenvolvimento

```bash
npm run dev
```

### Build para Produção

```bash
npm run build
```

Os arquivos estarão na pasta `dist/`.

## 📡 Edge Functions

### 1. hotmart-webhook

Recebe webhooks da Hotmart e cria usuários automaticamente quando o status é `APPROVED`.

**Endpoint**: `https://seu-projeto.supabase.co/functions/v1/hotmart-webhook`

**Método**: POST

**Configuração no Hotmart**: Configure este endpoint como webhook de notificação.

### 2. generate-copy

Gera copy (título e descrição) para produtos da Shopee usando Google Gemini.

**Endpoint**: `https://seu-projeto.supabase.co/functions/v1/generate-copy`

**Método**: POST

**Body**:
```json
{
  "product_name": "Nome do Produto",
  "features": "Características do produto",
  "category": "Categoria"
}
```

**Resposta**:
```json
{
  "title": "Título SEO gerado",
  "description": "Descrição persuasiva com emojis"
}
```

## 🌐 Deploy

### Frontend (Hostinger)

1. Execute `npm run build`
2. Faça upload da pasta `dist/` para o servidor
3. O arquivo `.htaccess` já está configurado na pasta `public/`

### Edge Functions (Supabase)

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref seu-project-ref

# Deploy das funções
supabase functions deploy hotmart-webhook
supabase functions deploy generate-copy
```

## 📝 Estrutura do Projeto

```
vini-rosado/
├── public/
│   └── .htaccess          # Configuração Apache para React Router
├── src/
│   ├── components/        # Componentes React
│   │   └── ProtectedRoute.tsx
│   ├── contexts/          # Contextos React
│   │   └── AuthContext.tsx
│   ├── lib/               # Bibliotecas e utilitários
│   │   └── supabase.ts
│   ├── pages/             # Páginas
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── functions/         # Edge Functions
│       ├── hotmart-webhook/
│       └── generate-copy/
└── package.json
```

## 🔐 Segurança

- As variáveis sensíveis estão em `.env` (não commitadas)
- RLS (Row Level Security) habilitado no Supabase
- Autenticação via Supabase Auth
- Service Role Key usada apenas nas Edge Functions
- Painel administrativo protegido por verificação de `is_admin`

## 👨‍💼 Painel Administrativo

O sistema inclui um painel administrativo completo em `/admin` para gerenciar usuários e monitorar o sistema.

### Tornar um usuário Admin

```bash
npm run make-admin <email>
```

Exemplo:
```bash
npm run make-admin admin@example.com
```

### Funcionalidades do Painel Admin

- **Métricas**: Total de usuários, copys geradas hoje, taxa de erros
- **Gerenciamento de Usuários**: Ver todos os usuários, banir/desbanir
- **Feed Global**: Últimas 10 gerações do sistema
- **Acesso Restrito**: Apenas usuários com `is_admin = true` podem acessar

### Segurança RLS

As políticas RLS foram atualizadas para permitir que admins:
- Vejam todos os perfis e gerações
- Atualizem qualquer perfil (para banir/desbanir)
- Acessem dados globais do sistema

## 📄 Licença

Este projeto é privado.

