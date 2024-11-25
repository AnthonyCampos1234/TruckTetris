import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface LineItem {
  item: string;
  quantityOrdered: number;
  totalPallets: number;
  qtyPerPallet: number;
  overhang: string;
  overhangBothSides: string;
  amount: string;
  oneSideOverhang: string;
  otherSideOverhang: string;
}

interface OrderData {
  orderHeader: {
    orderNumber: string;
    ackDate: string;
    poNumber: string;
  };
  lineItems: LineItem[];
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { orderId, raw_ocr_data } = await req.json()

    if (!orderId || !raw_ocr_data) {
      return NextResponse.json({ error: 'Missing orderId or raw_ocr_data' }, { status: 400 })
    }

    // Recalculate totalPallets for each line item
    const updatedLineItems = raw_ocr_data.lineItems.map((item: LineItem) => ({
      ...item,
      totalPallets: item.qtyPerPallet > 0
        ? Math.ceil(item.quantityOrdered / item.qtyPerPallet)
        : 0,
    }))

    const updatedRawOcrData: OrderData = {
      ...raw_ocr_data,
      lineItems: updatedLineItems,
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ raw_ocr_data: updatedRawOcrData })
      .eq('id', orderId)
      .select('*')

    if (error) {
      console.error('Error updating order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in API route:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}