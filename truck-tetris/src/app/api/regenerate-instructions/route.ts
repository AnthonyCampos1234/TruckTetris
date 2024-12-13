import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req: Request) {
  try {
    const { orderId, truckIndex, feedback, currentPlan, lineItems, isFullRegeneration } = await req.json()

    const prompt = isFullRegeneration 
      ? `You are a logistics expert. I need you to regenerate the complete loading instructions for all trucks based on this feedback: "${feedback}"` 
      : `You are a logistics expert. I need you to regenerate the loading instructions for truck ${truckIndex + 1} based on this feedback: "${feedback}"`

    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      system: "You are a logistics expert. Provide responses in pure JSON format only. Each string should be properly escaped."
    })

    const textContent = message.content[0].type === 'text' ? message.content[0] : null
    if (!textContent) {
      throw new Error('Unexpected response format from Claude')
    }

    // Parse and validate the response
    const newPlan = JSON.parse(textContent.text)

    return NextResponse.json({ 
      data: newPlan,
    })
  } catch (error) {
    console.error('Error regenerating instructions:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate instructions' },
      { status: 500 }
    )
  }
} 