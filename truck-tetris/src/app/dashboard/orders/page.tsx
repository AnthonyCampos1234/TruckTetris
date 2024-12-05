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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

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
  raw_ocr_data: {
    textLines: string[]
  }
}

function extractOrderDetails(rawOCRData: any) {
  if (!rawOCRData) {
    return null;
  }

  console.log('Raw OCR data:', rawOCRData);

  return {
    orderNumber: rawOCRData.orderHeader?.orderNumber || 'Processing...',
    customer: 'Shorr Packaging Corp.',
    deliveryDate: rawOCRData.orderHeader?.ackDate || 'Processing...'
  };
}

export default function Orders() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [userData, setUserData] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

  const handleClearOrders = async () => {
    try {
      console.log('Starting delete operation...');
      
      // Delete all orders with a simpler WHERE clause
      const { data, error: deleteError } = await supabase
        .from('orders')
        .delete()
        .neq('id', 0) // This will match all records since ID can't be 0
        .select()

      console.log('Delete response:', { data, error: deleteError });

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Close the dialog
      setShowDeleteDialog(false)
      
      // Refresh the orders list
      await fetchOrders()

      // Show success toast
      toast({
        title: "Success",
        description: `Successfully deleted ${data?.length || 0} orders`,
      })

    } catch (error) {
      console.error('Error clearing orders:', error instanceof Error ? error.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to delete orders",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order Information</h1>
        <div className="flex gap-4">
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)}
          >
            Clear All Orders
          </Button>
          <Button 
            variant="default" 
            onClick={() => router.push('/dashboard')}
          >
            Upload File
          </Button>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Orders</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all orders? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearOrders}
            >
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Order #</TableHead>
              <TableHead className="w-1/4">Customer</TableHead>
              <TableHead className="w-1/4">Delivery Date</TableHead>
              <TableHead className="w-1/4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              let details = null;
              if (order.raw_ocr_data) {
                details = extractOrderDetails(order.raw_ocr_data);
              }

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {details?.orderNumber || 'Processing...'}
                  </TableCell>
                  <TableCell>
                    {details ? 'Shorr Packaging Corp.' : 'Processing...'}
                  </TableCell>
                  <TableCell>
                    {details?.deliveryDate || 'Processing...'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}