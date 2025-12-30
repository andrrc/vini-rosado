-- Adicionar política RLS para DELETE na tabela generations
-- Usuários podem excluir suas próprias gerações OU admin pode excluir todas
-- Esta política usa a função is_current_user_admin() criada na migration 003

-- Política para usuários excluírem suas próprias gerações OU admin excluir todas
CREATE POLICY "Users can delete own generations or admin can delete all" ON generations
  FOR DELETE USING (
    auth.uid() = user_id OR 
    is_current_user_admin()
  );

