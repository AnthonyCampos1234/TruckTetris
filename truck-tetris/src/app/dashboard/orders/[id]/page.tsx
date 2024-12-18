'use client'

import { useEffect, useState, useRef } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TruckVisualization } from '@/components/TruckVisualization'
import { Textarea } from "@/components/ui/textarea"

interface OrderData {
  orderHeader: {
    orderNumber: string;
    ackDate: string;
    poNumber: string;
  };
  lineItems: LineItem[];
  textLines: string[];
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
  length: number;
  width: number;
  height: number;
}

function convertVisualization(visualization: any) {
  if (visualization.pallets) {
    return visualization.pallets
  }

  if (Array.isArray(visualization.sideView)) {
    return [{
      id: 'converted',
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      depth: 80,
      color: '#808080'
    }]
  }

  return []
}

function extractOrderDetails(textLines: string[] | undefined) {
  if (!textLines || !Array.isArray(textLines)) {
    return {
      orderNumber: '70615286-00',  
      customer: 'Shorr Packaging Corp.',
      deliveryDate: '11/07/24',
      poNumber: '7007299598'
    }
  }

  return {
    orderNumber: textLines.find(line => line.match(/^\d{8}-\d{2}$/))?.trim() || '70615286-00',
    customer: 'Shorr Packaging Corp.',
    deliveryDate: textLines.find(line => line.match(/^\d{2}\/\d{2}\/\d{2}$/))?.trim() || '11/07/24',
    poNumber: textLines.find(line => /^700\d+$/.test(line))?.trim() || '7007299598'
  }
}

export default function OrderDetail() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState<any>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<OrderData | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [numTrucks, setNumTrucks] = useState(1)
  const [allowStacking, setAllowStacking] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [showRepromptDialog, setShowRepromptDialog] = useState<number | null>(null)
  const [repromptText, setRepromptText] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

  useEffect(() => {
    if (orderData && !editedData) {
      setEditedData(JSON.parse(JSON.stringify(orderData))) 
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
    console.log('Optimization data:', data.raw_ocr_data?.optimization)
    
    const filteredData = {
      ...data.raw_ocr_data,
      lineItems: data.raw_ocr_data.lineItems.filter((item: LineItem) => 
        !item.item.toLowerCase().includes('currency:')
      )
    }
    
    setOrder(data)
    setOrderData(filteredData)
    setEditedData(JSON.parse(JSON.stringify(filteredData)))

    if (data.loading_instructions) {
      console.log('Setting optimization result:', data.loading_instructions)
      setOptimizationResult(data.loading_instructions)
    }

    setLoading(false)
  }

  const handleInputChange = (index: number, field: keyof LineItem, value: string) => {
    if (!editedData) return

    console.log('Updating field:', field, 'with value:', value)

    const newLineItems = [...editedData.lineItems]
    const updatedItem = { ...newLineItems[index] }

    switch (field) {
      case 'quantityOrdered':
      case 'qtyPerPallet':
        updatedItem[field] = parseInt(value) || 0
        break
      case 'length':
      case 'width':
      case 'height':
        updatedItem[field] = parseFloat(value) || 0
        break
      case 'item':
      case 'overhang':
      case 'overhangBothSides':
      case 'oneSideOverhang':
      case 'otherSideOverhang':
        updatedItem[field] = value
        break
      default:
        console.warn(`Unhandled field: ${field}`)
    }

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

  const handleOptimize = async () => {
    setIsOptimizing(true)
    try {
      const response = await fetch('/api/optimize-loading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: params.id,
          lineItems: editedData?.lineItems,
          numTrucks,
          allowStacking,
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to optimize loading')
      }

      if (result.error) {
        throw new Error(result.error)
      }
      
      const newOptimizationResult = result.data
      
      setOptimizationResult(newOptimizationResult)
      
      console.log('Saving optimization result:', newOptimizationResult) 

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          loading_instructions: newOptimizationResult,
          raw_ocr_data: {
            ...editedData,
            optimization: newOptimizationResult
          }
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Error updating database:', updateError) 
        throw updateError
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('orders')
        .select('loading_instructions')
        .eq('id', params.id)
        .single()

      console.log('Verification data:', verifyData) 

      if (verifyError) {
        console.error('Error verifying update:', verifyError)
      }

      setDialogOpen(false)

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)

      toast({
        title: "Optimization Complete",
        description: "Loading plan has been generated successfully",
      })
    } catch (error) {
      console.error('Optimization error:', error)
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleReprompt = async (truckIndex: number) => {
    try {
      setIsRegenerating(true)
      
      const response = await fetch('/api/regenerate-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: params.id,
          truckIndex,
          feedback: repromptText,
          currentPlan: optimizationResult.trucks[truckIndex],
          lineItems: editedData?.lineItems,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate instructions')
      }

      const result = await response.json()
      
      const updatedTrucks = [...optimizationResult.trucks]
      updatedTrucks[truckIndex] = result.data
      
      const newOptimizationResult = {
        ...optimizationResult,
        trucks: updatedTrucks,
      }
      

      setOptimizationResult(newOptimizationResult)

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          loading_instructions: newOptimizationResult  
        })
        .eq('id', params.id)

      if (updateError) {
        throw new Error('Failed to save changes to database')
      }

      setShowRepromptDialog(null)
      setRepromptText('')
      
      toast({
        title: "Instructions Regenerated",
        description: (
          <div className="mt-2 space-y-2">
            <p>{result.data.changes}</p>
            <p className="text-sm text-muted-foreground">{result.data.reasoning}</p>
          </div>
        ),
        duration: 5000,
      })

    } catch (error) {
      console.error('Error regenerating instructions:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate instructions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleRepromptAll = async () => {
    try {
      setIsRegenerating(true)
      
      const response = await fetch('/api/regenerate-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: params.id,
          feedback: repromptText,
          currentPlan: optimizationResult,
          lineItems: editedData?.lineItems,
          isFullRegeneration: true, 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate instructions')
      }

      const result = await response.json()
      
      setOptimizationResult(result.data)

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          loading_instructions: result.data
        })
        .eq('id', params.id)

      if (updateError) {
        throw new Error('Failed to save changes to database')
      }

      setShowRepromptDialog(null)
      setRepromptText('')
      
      toast({
        title: "All Instructions Regenerated",
        description: (
          <div className="mt-2 space-y-2">
            <p>{result.data.changes}</p>
            <p className="text-sm text-muted-foreground">{result.data.reasoning}</p>
          </div>
        ),
        duration: 5000,
      })

    } catch (error) {
      console.error('Error regenerating instructions:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate instructions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const orderDetails = orderData?.textLines ? extractOrderDetails(orderData.textLines) : extractOrderDetails(undefined)

  if (loading) return <div>Loading...</div>
  if (!order || !orderData) return <div>Order not found</div>

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Order Number</h4>
              <p className="mt-1">{orderData.orderHeader.orderNumber}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Customer</h4>
              <p className="mt-1">Shorr Packaging Corp.</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Delivery Date</h4>
              <p className="mt-1">{orderData.orderHeader.ackDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Line Items
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
            </CardTitle>
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
                    <TableHead className="text-center">Length (in)</TableHead>
                    <TableHead className="text-center">Width (in)</TableHead>
                    <TableHead className="text-center">Height (in)</TableHead>
                    <TableHead className="text-center">Overhang?</TableHead>
                    <TableHead className="text-center">Overhang Both Sides?</TableHead>
                    <TableHead className="text-center">One Side Overhang (in)</TableHead>
                    <TableHead className="text-center">Other Side Overhang (in)</TableHead>
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
                          <Input
                            type="number"
                            value={item.length || ''}
                            onChange={(e) => handleInputChange(index, 'length', e.target.value)}
                            placeholder="Length"
                          />
                        ) : item.length || '-'}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.width || ''}
                            onChange={(e) => handleInputChange(index, 'width', e.target.value)}
                            placeholder="Width"
                          />
                        ) : item.width || '-'}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.height || ''}
                            onChange={(e) => handleInputChange(index, 'height', e.target.value)}
                            placeholder="Height"
                          />
                        ) : item.height || '-'}
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="ml-4">
              Optimize Loading
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Optimize Truck Loading</DialogTitle>
              <DialogDescription>
                Configure the parameters for load optimization
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trucks">Number of Trucks</Label>
                <Input
                  id="trucks"
                  type="number"
                  min={1}
                  value={numTrucks}
                  onChange={(e) => setNumTrucks(parseInt(e.target.value) || 1)}
                  className="col-span-3"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="stacking"
                  checked={allowStacking}
                  onCheckedChange={setAllowStacking}
                />
                <Label htmlFor="stacking">Allow Stacking</Label>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleOptimize} disabled={isOptimizing}>
                {isOptimizing ? (
                  <>
                    <span className="mr-2">Optimizing...</span>
                    <span className="animate-spin">⚡</span>
                  </>
                ) : (
                  'Generate Loading Plan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {optimizationResult && (
          <div ref={resultsRef} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Loading Instructions</span>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRepromptDialog(-1)} 
                  >
                    Regenerate All Instructions
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>

            {optimizationResult.trucks.map((truck: any, index: number) => (
              <Card key={index} className="mt-8">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Truck {truck.truckNumber} Loading Plan</span>
                    <Button 
                      variant="outline"
                      onClick={() => setShowRepromptDialog(index)}
                    >
                      Regenerate Instructions
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Loading Plan</h4>
                    <p>{truck.loadingPlan}</p>
                  </div>

                  {truck.changes && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h4 className="font-semibold">Changes Made</h4>
                      <p>{truck.changes}</p>
                      <h4 className="font-semibold mt-3">Reasoning</h4>
                      <p className="text-muted-foreground">{truck.reasoning}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Loading Sequence</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <h5 className="text-sm font-medium mb-3">Front Section</h5>
                        <div className="space-y-2">
                          {truck.sequence.slice(0, Math.ceil(truck.sequence.length / 2)).map((step: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm flex-shrink-0">
                                {index + 1}
                              </div>
                              <p className="text-sm">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium mb-3">Rear Section</h5>
                        <div className="space-y-2">
                          {truck.sequence.slice(Math.ceil(truck.sequence.length / 2)).map((step: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm flex-shrink-0">
                                {index + Math.ceil(truck.sequence.length / 2) + 1}
                              </div>
                              <p className="text-sm">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Space Utilization</h4>
                      <p>{truck.spaceUtilization}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Height Clearance</h4>
                      <p>{truck.heightClearance}</p>
                    </div>
                  </div>

                  {truck.specialNotes !== "None" && (
                    <div>
                      <h4 className="font-semibold mb-2">Special Notes</h4>
                      <p>{truck.specialNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Summary and Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p>{optimizationResult.summary}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Warnings</h4>
                  <ul className="list-disc pl-4">
                    {optimizationResult.warnings.map((warning: string, index: number) => (
                      <li key={index} className="text-amber-600">{warning}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <ul className="list-disc pl-4">
                    {optimizationResult.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Dialog open={showRepromptDialog !== null} onOpenChange={() => setShowRepromptDialog(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {showRepromptDialog === -1 
                      ? "Regenerate All Loading Instructions" 
                      : `Regenerate Truck ${(showRepromptDialog ?? 0) + 1} Instructions`}
                  </DialogTitle>
                  <DialogDescription>
                    Describe what's wrong with the current instructions or what specific changes you'd like to see.
                  </DialogDescription>
                </DialogHeader>
                
                <Textarea
                  value={repromptText}
                  onChange={(e) => setRepromptText(e.target.value)}
                  placeholder="Example: The pallets need more space between them for forklift access"
                  className="min-h-[100px]"
                />

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRepromptDialog(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (showRepromptDialog === -1) {
                        handleRepromptAll()
                      } else {
                        handleReprompt(showRepromptDialog ?? 0)
                      }
                    }}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}