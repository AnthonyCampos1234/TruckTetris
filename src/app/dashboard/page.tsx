'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout>()
  const [success, setSuccess] = useState<string | null>(null)
  const successTimeoutRef = useRef<NodeJS.Timeout>()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    
    checkUser()

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const showError = (message: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }

    setError(message)

    errorTimeoutRef.current = setTimeout(() => {
      setError(null)
    }, 3000)
  }

  const validateFiles = (files: File[]): File[] => {
    const validFiles = files.filter(file => {
      const isPDF = file.type === 'application/pdf'
      if (!isPDF) {
        showError('Only PDF files are allowed')
        return false
      }
      return true
    })
    return validFiles
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || isProcessing) return
    
    const fileArray = Array.from(files)
    const validFiles = validateFiles(fileArray)
    
    if (validFiles.length > 0) {
      setIsProcessing(true)
      try {
        for (const file of validFiles) {
          console.log('Processing file:', file.name)
          
          const fileName = `${uuidv4()}.pdf`
          const filePath = `${user.id}/${fileName}`

          console.log('Uploading file...')
          const { error: uploadError } = await supabase.storage
            .from('order_documents')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw uploadError
          }
          console.log('File uploaded successfully')

          console.log('Creating order record...')
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
              uploaded_by: user.id,
              document_path: filePath,
              status: 'pending',
            })
            .select()
            .single()

          if (orderError) {
            console.error('Order creation error:', orderError)
            throw orderError
          }
          console.log('Order created:', orderData)

          console.log('Calling Edge Function...')
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
              throw new Error('No active session')
            }

            console.log('Invoking process-pdf function with orderId:', orderData.id)
            const { data, error } = await supabase.functions.invoke<any>(
              'process-pdf',
              {
                method: 'POST',
                body: { orderId: orderData.id },
                headers: { 
                  Authorization: `Bearer ${session.access_token}`
                }
              }
            )

            if (error) {
              console.error('Function error details:', error)
              throw new Error(error.message || 'Function invocation failed')
            }
            
            console.log('Function response:', data)
            showSuccess('File processed successfully')
          } catch (functionError) {
            console.error('Function invocation error:', functionError)
            showError(functionError instanceof Error ? functionError.message : 'Failed to process file')
          }
        }
        showSuccess('File processed successfully')
      } catch (error) {
        console.error('Error:', error)
        showError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const showSuccess = (message: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
    }

    setSuccess(message)

    successTimeoutRef.current = setTimeout(() => {
      setSuccess(null)
    }, 3000)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Upload Orders</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center transition-colors relative",
          isDragging 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
            : "border-gray-300 dark:border-gray-700",
          error ? "border-red-500" : "",
          isProcessing ? "pointer-events-none opacity-50" : ""
        )}
      >
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
            <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Processing PDF...</p>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          multiple
          accept=".pdf,application/pdf"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center gap-4">
          <Upload className={cn(
            "w-12 h-12",
            error ? "text-red-500" : "text-gray-400"
          )} />
          <div className="text-xl font-medium">
            Drag and drop your PDF files here
          </div>
          {error ? (
            <p className="text-sm text-red-500">
              {error}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Only PDF files are accepted
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">or</span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBrowseClick}
            className="mt-2"
            disabled={isProcessing}
          >
            Browse Files
          </Button>
        </div>
      </div>
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
    </div>
  )
} 