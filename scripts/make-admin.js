import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

/* global process */

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

async function makeAdmin() {
  loadEnv()

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas!')
    console.error('')
    console.error('Configure no arquivo .env:')
    console.error('  VITE_SUPABASE_URL=sua_url_do_supabase')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key')
    console.error('')
    console.error('Para obter a Service Role Key:')
    console.error('  1. Acesse o dashboard do Supabase')
    console.error('  2. Vá em Settings > API')
    console.error('  3. Copie a "service_role" key (secret)')
    process.exit(1)
  }

  const email = process.argv[2]

  if (!email) {
    console.error('❌ Erro: Email não fornecido!')
    console.error('')
    console.error('Uso: npm run make-admin <email>')
    console.error('Exemplo: npm run make-admin admin@example.com')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    console.log(`🔍 Buscando usuário com email: ${email}...`)

    // Buscar usuário pelo email no Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Erro ao listar usuários: ${listError.message}`)
    }

    const user = users.find((u) => u.email === email)

    if (!user) {
      console.error(`❌ Usuário com email ${email} não encontrado!`)
      process.exit(1)
    }

    console.log(`✅ Usuário encontrado: ${user.email} (ID: ${user.id})`)

    // Atualizar perfil para tornar admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id)
      .select()
      .single()

    if (profileError) {
      // Se o perfil não existe, criar
      if (profileError.code === 'PGRST116') {
        console.log('📝 Criando perfil...')
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || null,
            is_admin: true,
            is_banned: false,
          })
          .select()
          .single()

        if (createError) {
          throw new Error(`Erro ao criar perfil: ${createError.message}`)
        }

        console.log('✅ Perfil criado com sucesso!')
        console.log('')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ USUÁRIO TORNADO ADMIN COM SUCESSO!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Email: ${user.email}`)
        console.log(`ID: ${user.id}`)
        console.log(`Status: Admin`)
        return
      }
      throw new Error(`Erro ao atualizar perfil: ${profileError.message}`)
    }

    console.log('✅ Perfil atualizado com sucesso!')
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ USUÁRIO TORNADO ADMIN COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Email: ${user.email}`)
    console.log(`ID: ${user.id}`)
    console.log(`Status: Admin`)
    console.log('')
    console.log('💡 O usuário agora pode acessar /admin')
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

makeAdmin()

