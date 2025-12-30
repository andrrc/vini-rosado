import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente do arquivo .env
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
    }
  }
}

// Gerar senha aleatória
function generateRandomPassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
  const bytes = randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length]
  }
  return password
}

async function createTestUser() {
  // Carregar .env se existir
  loadEnv()

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas!')
    console.error('')
    console.error('Configure no arquivo .env:')
    console.error('  VITE_SUPABASE_URL=sua_url_aqui')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui')
    console.error('')
    console.error('Ou exporte as variáveis:')
    console.error('  export VITE_SUPABASE_URL="..."')
    console.error('  export SUPABASE_SERVICE_ROLE_KEY="..."')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const email = 'andre@gmail.com'
  const password = generateRandomPassword(16)
  const name = 'Andre Teste'

  try {
    console.log('🔄 Criando usuário de teste...')
    console.log(`   Email: ${email}`)
    console.log(`   Nome: ${name}`)
    console.log('')

    let userId = null

    // Tentar criar o usuário primeiro
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    })

    if (createError) {
      // Se o erro for de usuário já existente, buscar o usuário
      const errorMsg = createError.message?.toLowerCase() || ''
      const isDuplicateError = 
        errorMsg.includes('already registered') ||
        errorMsg.includes('user already exists') ||
        errorMsg.includes('already exists') ||
        createError.status === 422

      if (isDuplicateError) {
        console.log('⚠️  Usuário já existe! Buscando usuário...')

        // Listar usuários e encontrar por email
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
        
        if (listError) {
          throw new Error(`Erro ao listar usuários: ${listError.message}`)
        }

        const existingUser = usersData.users.find(u => u.email === email)
        
        if (!existingUser) {
          throw new Error('Usuário não encontrado mesmo após erro de duplicação')
        }

        userId = existingUser.id
        console.log('✅ Usuário encontrado! Atualizando senha...')

        // Atualizar senha do usuário existente
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { password }
        )

        if (updateError) {
          throw updateError
        }

        console.log('✅ Senha atualizada com sucesso!')
      } else {
        throw createError
      }
    } else if (newUser?.user) {
      userId = newUser.user.id
      console.log('✅ Usuário criado com sucesso!')
    } else {
      throw new Error('Falha ao criar usuário: resposta vazia')
    }

    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          name,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })

      if (profileError) {
        console.warn('⚠️  Aviso: Erro ao salvar perfil (pode ser que a tabela ainda não exista):', profileError.message)
      } else {
        console.log('✅ Perfil criado/atualizado com sucesso!')
      }
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 CREDENCIAIS DE TESTE')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Email: ${email}`)
    console.log(`Senha: ${password}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('💡 Guarde essas credenciais! Você precisará delas para fazer login.')

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message)
    process.exit(1)
  }
}

createTestUser()

