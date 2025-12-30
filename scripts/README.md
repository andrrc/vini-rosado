# Scripts de Administração

## Criar Usuário de Teste

Este script cria uma conta de teste no Supabase com o email `andre@gmail.com` e uma senha aleatória.

### Pré-requisitos

1. Tenha um arquivo `.env` na raiz do projeto com:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   ```

2. A tabela `profiles` deve estar criada no Supabase (execute a migration em `supabase/migrations/001_create_profiles_table.sql`)

### Como obter a Service Role Key

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie a **service_role** key (⚠️ **NUNCA** compartilhe essa chave publicamente!)

### Executar o script

```bash
npm run create-test-user
```

O script irá:
- Criar o usuário `andre@gmail.com` (ou atualizar a senha se já existir)
- Gerar uma senha aleatória de 16 caracteres
- Criar/atualizar o perfil na tabela `profiles`
- Exibir as credenciais no terminal

### Exemplo de saída

```
🔄 Criando usuário de teste...
   Email: andre@gmail.com
   Nome: Andre Teste

✅ Usuário criado com sucesso!
✅ Perfil criado/atualizado com sucesso!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CREDENCIAIS DE TESTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: andre@gmail.com
Senha: Ab3$kL9mN2pQr5t
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Guarde essas credenciais! Você precisará delas para fazer login.
```

