-- Configurar políticas RLS para o bucket 'video-assets'
-- Este bucket armazena imagens enviadas pelos usuários para geração de vídeos
--
-- IMPORTANTE: O bucket deve ser criado manualmente no Dashboard do Supabase:
-- 1. Vá em Storage > New bucket
-- 2. Nome: video-assets
-- 3. Public bucket: true (marcar como público)
-- 4. File size limit: 50MB (ou o valor desejado)
-- 5. Allowed MIME types: image/* (ou deixar vazio para permitir todos)

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload images to video-assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images from video-assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images from video-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to video-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view video-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from video-assets" ON storage.objects;

-- Política para permitir que usuários autenticados façam upload de arquivos
CREATE POLICY "Authenticated users can upload to video-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-assets');

-- Política para permitir que usuários autenticados leiam arquivos do bucket
CREATE POLICY "Authenticated users can view video-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'video-assets');

-- Política para permitir que usuários autenticados excluam arquivos do bucket
CREATE POLICY "Authenticated users can delete from video-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'video-assets');

