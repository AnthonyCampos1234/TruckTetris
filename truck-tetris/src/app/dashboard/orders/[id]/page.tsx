'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { supabase } from '@/lib/supabase-client'

interface OrderData {
  orderHeader: {
    orderNumber: string;
    ackDate: string;
    poNumber: string;
  };
  lineItems: LineItem[];
}

interface LineItem {
  item: string;
  quantityOrdered: number;
  totalPallets: number;
  qtyPerPallet: number;
  overhang: string;
  overhangBothSides: string;
  oneSideOverhang: string;
  otherSideOverhang: string;
}

export default function OrderDetail() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState<any>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<OrderData | null>(null)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

  useEffect(() => {
    if (orderData && !editedData) {
      setEditedData(JSON.parse(JSON.stringify(orderData))) // Deep copy
    }
  }, [orderData])

  const fetchOrderDetails = async () => {
    console.log('Fetching order details...')
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching order:', error)
      toast({
        title: "Error fetching order",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
      return
    }

    console.log('Fetched data:', data)
    
    // Filter out currency items from the raw OCR data
    const filteredData = {
      ...data.raw_ocr_data,
      lineItems: data.raw_ocr_data.lineItems.filter((item: LineItem) => 
        !item.item.toLowerCase().includes('currency:')
      )
    }
    
    setOrder(data)
    setOrderData(filteredData)
    setEditedData(JSON.parse(JSON.stringify(filteredData)))
    setLoading(false)
  }

  const handleInputChange = (index: number, field: keyof LineItem, value: string) => {
    if (!editedData) return

    console.log('Updating field:', field, 'with value:', value)

    const newLineItems = [...editedData.lineItems]
    const updatedItem = { ...newLineItems[index] }

    switch (field) {
      case 'quantityOrdered':
        updatedItem.quantityOrdered = parseInt(value) || 0
        break
      case 'qtyPerPallet':
        updatedItem.qtyPerPallet = parseInt(value) || 0
        break
      case 'item':
      case 'overhang':
      case 'overhangBothSides':
      case 'oneSideOverhang':
      case 'otherSideOverhang':
        updatedItem[field] = value
        break
      // No case for 'totalPallets' since it's read-only
      default:
        // Optionally handle unexpected fields
        console.warn(`Unhandled field: ${field}`)
    }

    // Auto-calculate totalPallets if quantityOrdered or qtyPerPallet changes
    if (field === 'quantityOrdered' || field === 'qtyPerPallet') {
      if (updatedItem.qtyPerPallet > 0) {
        updatedItem.totalPallets = Math.ceil(updatedItem.quantityOrdered / updatedItem.qtyPerPallet)
      } else {
        updatedItem.totalPallets = 0
      }
    }

    newLineItems[index] = updatedItem

    const newEditedData = {
      ...editedData,
      lineItems: newLineItems
    }

    console.log('New edited data:', newEditedData)
    setEditedData(newEditedData)
  }

  const handleSave = async () => {
    try {
      console.log('Order ID:', params.id)
      console.log('Saving edited data:', editedData)

      if (!editedData) {
        throw new Error('No data to save')
      }

      if (!params.id) {
        throw new Error('No order ID provided')
      }

      // Call the API route
      const response = await fetch('/api/updateOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: params.id,
          raw_ocr_data: editedData
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error updating order')
      }

      const result = await response.json()
      const updatedOrder = result.data[0]
      setOrder(updatedOrder)
      setOrderData(updatedOrder.raw_ocr_data)
      setEditedData(JSON.parse(JSON.stringify(updatedOrder.raw_ocr_data)))

      setIsEditing(false)
      toast({
        title: "Changes saved successfully",
        variant: "default",
      })
    } catch (error) {
      console.error('Error saving changes:', error)
      // Log the full error object
      console.log('Full error object:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      toast({
        title: "Error saving changes",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  if (loading) return <div>Loading...</div>
  if (!order || !orderData) return <div>Order not found</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
        {isEditing ? (
          <div className="space-x-2">
            <Button variant="outline" onClick={() => {
              setEditedData(JSON.parse(JSON.stringify(orderData)))
              setIsEditing(false)
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            Edit Items
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Order Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <dt className="font-medium">Order Number</dt>
              <dd>{orderData.orderHeader.orderNumber}</dd>
            </div>
            <div>
              <dt className="font-medium">ACK Date</dt>
              <dd>{orderData.orderHeader.ackDate}</dd>
            </div>
            <div>
              <dt className="font-medium">PO Number</dt>
              <dd>{orderData.orderHeader.poNumber}</dd>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="divide-x">
                    <TableHead className="text-center">Item</TableHead>
                    <TableHead className="text-center">QTY Ordered</TableHead>
                    <TableHead className="text-center">Total Pallets</TableHead>
                    <TableHead className="text-center">QTY per Pallet</TableHead>
                    <TableHead className="text-center">Overhang?</TableHead>
                    <TableHead className="text-center">Overhang Both Sides?</TableHead>
                    <TableHead className="text-center">One Side Overhang</TableHead>
                    <TableHead className="text-center">Other Side Overhang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedData?.lineItems?.map((item: LineItem, index: number) => (
                    <TableRow key={index} className="divide-x">
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={item.item}
                            onChange={(e) => handleInputChange(index, 'item', e.target.value)}
                          />
                        ) : item.item}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.quantityOrdered}
                            onChange={(e) => handleInputChange(index, 'quantityOrdered', e.target.value)}
                          />
                        ) : item.quantityOrdered}
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {item.totalPallets}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.qtyPerPallet}
                            onChange={(e) => handleInputChange(index, 'qtyPerPallet', e.target.value)}
                          />
                        ) : item.qtyPerPallet}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            className="w-full p-2 border rounded"
                            value={item.overhang}
                            onChange={(e) => handleInputChange(index, 'overhang', e.target.value)}
                          >
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        ) : item.overhang}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            className="w-full p-2 border rounded"
                            value={item.overhangBothSides}
                            onChange={(e) => handleInputChange(index, 'overhangBothSides', e.target.value)}
                          >
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        ) : item.overhangBothSides}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={item.oneSideOverhang}
                            onChange={(e) => handleInputChange(index, 'oneSideOverhang', e.target.value)}
                          />
                        ) : item.oneSideOverhang}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={item.otherSideOverhang}
                            onChange={(e) => handleInputChange(index, 'otherSideOverhang', e.target.value)}
                          />
                        ) : item.otherSideOverhang}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}