'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Order {
  id: string
  order_number: string
  customer_name: string
  destination: string
  status: string
  delivery_date: string
  document_path: string
  created_at: string
}

export default function Orders() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUserData(user)
      fetchOrders()
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return
    }

    setOrders(data || [])
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file || !userData) return

      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order_documents')
        .upload(`${userData.id}/${uuidv4()}.pdf`, file)

      if (uploadError) throw uploadError

      // Create order record
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            document_path: uploadData.path,
            uploaded_by: userData.id,
            status: 'pending'
          }
        ])
        .select()
        .single()

      if (orderError) throw orderError

      // Trigger the processing function
      await fetch('/api/process-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: orderData.id })
      })

      // Refresh orders list
      fetchOrders()
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    }

    return (
      <Badge className={statusStyles[status as keyof typeof statusStyles]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleViewDocument = async (documentPath: string) => {
    const { data, error } = await supabase.storage
      .from('order_documents')
      .createSignedUrl(documentPath, 60) // URL valid for 60 seconds

    if (error) {
      console.error('Error creating signed URL:', error)
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order Information</h1>
        <input type="file" accept=".pdf" onChange={handleFileUpload} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.order_number || 'Processing...'}</TableCell>
                <TableCell>{order.customer_name || 'Processing...'}</TableCell>
                <TableCell>{order.destination || 'Processing...'}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>{order.delivery_date || 'Processing...'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDocument(order.document_path)}
                    >
                      View PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}