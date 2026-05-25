import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { groupId, standardSeats, planType = 'monthly' } = await request.json()

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    if (!standardSeats) {
      return NextResponse.json({ error: 'No seats selected' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email || ''

    // Buscar customer existente ou criar
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    let customerId = ''
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId },
      })
      customerId = customer.id
    }

    const lineItems: any[] = []

    const standardSeatPriceId = (STRIPE_PRICE_IDS as any)[`standard_seat_${planType}`]
    if (standardSeats > 0 && standardSeatPriceId) {
      lineItems.push({
        price: standardSeatPriceId,
        quantity: standardSeats,
      })
    }
    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'Invalid price IDs' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || 'https://anesteasy.com.br'

    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${origin}/grupos/${groupId}?checkout_success=true`,
      cancel_url: `${origin}/grupos/${groupId}?checkout_canceled=true`,
      metadata: {
        user_id: userId,
        group_id: groupId,
        type: 'group_seats',
        standard_seats: standardSeats.toString()
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          group_id: groupId,
          type: 'group_seats',
          standard_seats: standardSeats.toString()
        }
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Error creating group seats checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
