# 📦 Configuração do Supabase Storage

## Passo 1: Criar o Bucket

1. Acesse o **Dashboard do Supabase**
2. Vá em **Storage** (menu lateral)
3. Clique em **New bucket**
4. Configure:
   - **Name**: `video-assets`
   - **Public bucket**: ✅ **Marcar como público** (importante!)
   - **File size limit**: `50MB` (ou o valor desejado)
   - **Allowed MIME types**: `image/*` (ou deixar vazio)
5. Clique em **Create bucket**

## Passo 2: Executar a Migration

Execute a migration SQL no Supabase:

1. Vá em **SQL Editor** no Dashboard
2. Abra o arquivo `004_setup_storage_policies.sql`
3. Copie e cole o conteúdo no editor SQL
4. Clique em **Run** para executar

Ou execute via CLI:

```bash
supabase db push
```

## Verificação

Após executar a migration, verifique se as políticas foram criadas:

1. Vá em **Storage** > **Policies**
2. Verifique se existem 3 políticas para o bucket `video-assets`:
   - ✅ Authenticated users can upload to video-assets
   - ✅ Authenticated users can view video-assets
   - ✅ Authenticated users can delete from video-assets

## Troubleshooting

Se ainda houver erro de RLS:

1. Verifique se o bucket está marcado como **público**
2. Verifique se o usuário está autenticado (faça login novamente)
3. Verifique se as políticas foram criadas corretamente
4. Tente fazer upload novamente



