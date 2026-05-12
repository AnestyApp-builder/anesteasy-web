import { NextRequest, NextResponse } from 'next/server'
import { adminNotifier } from '@/lib/notifications/admin-service'

export async function POST(request: NextRequest) {
  try {
    const { name, email, specialty, crm } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
    }

    await adminNotifier.notifyNewUserRegistered({ name, email, specialty, crm })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
