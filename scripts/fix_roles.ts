import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase keys')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Fetching secretarias and their invites...')
  
  // Find all secretarias
  const { data: secretarias, error: secError } = await supabase
    .from('secretarias')
    .select('id, email, role')
  
  if (secError) {
    console.error('Error fetching secretarias:', secError)
    return
  }
  
  for (const sec of secretarias) {
    // Find matching invite to get the intended role
    const { data: invite, error: invError } = await supabase
      .from('secretaria_invites')
      .select('role')
      .eq('email', sec.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (invite && invite.role && invite.role !== sec.role) {
      console.log(`Updating ${sec.email} from ${sec.role} to ${invite.role}`)
      const { error: updError } = await supabase
        .from('secretarias')
        .update({ role: invite.role })
        .eq('id', sec.id)
        
      if (updError) {
        console.error('Error updating:', updError)
      } else {
        console.log('Updated successfully')
      }
    }
  }
  console.log('Done')
}

main()
