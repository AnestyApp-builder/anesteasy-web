import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('secretary_session_id')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro no logout da secretária:', error)
    return NextResponse.json({ error: 'Erro ao deslogar' }, { status: 500 })
  }
}
