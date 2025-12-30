-- Adicionar colunas is_admin e is_banned na tabela profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance de queries administrativas
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;

-- Função auxiliar para verificar se o usuário atual é admin
-- Usa SECURITY DEFINER para bypassar RLS quando necessário
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Atualizar políticas RLS para profiles
-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Nova política: Usuários podem ver seu próprio perfil OU se for admin, pode ver todos
CREATE POLICY "Users can view own profile or admin can view all" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    is_current_user_admin()
  );

-- Nova política: Usuários podem atualizar seu próprio perfil OU admin pode atualizar qualquer perfil
CREATE POLICY "Users can update own profile or admin can update all" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    is_current_user_admin()
  );

-- Atualizar políticas RLS para generations
-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can view own generations" ON generations;
DROP POLICY IF EXISTS "Users can update own generations" ON generations;

-- Nova política: Usuários podem ver suas próprias gerações OU admin pode ver todas
CREATE POLICY "Users can view own generations or admin can view all" ON generations
  FOR SELECT USING (
    auth.uid() = user_id OR 
    is_current_user_admin()
  );

-- Nova política: Usuários podem atualizar suas próprias gerações OU admin pode atualizar todas
CREATE POLICY "Users can update own generations or admin can update all" ON generations
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    is_current_user_admin()
  );

-- Manter políticas de INSERT (usuários só podem inserir suas próprias gerações)
-- A política de INSERT não precisa mudar, pois admins não precisam criar gerações para outros usuários

