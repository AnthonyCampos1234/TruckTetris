import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const TRUCK_DIMENSIONS = {
  length: 631, 
  width: 100,  
  heightNose: 100, 
  heightRear: 112, 
  heightDoorOpening: 111 
}

function sanitizeJsonString(str: string): string {
  let cleanStr = str
    .replace(/```json\s*/, '')
    .replace(/```\s*$/, '')
    .trim()

  try {
    JSON.parse(cleanStr)
    return cleanStr
  } catch (e) {
    cleanStr = cleanStr
      .replace(/"""/g, '"')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .trim()

    console.log('Sanitized text:', cleanStr)
    
    return cleanStr
  }
}

function chunkTrucks(trucks: any[], size: number) {
  const chunks = []
  for (let i = 0; i < trucks.length; i += size) {
    chunks.push(trucks.slice(i, i + size))
  }
  return chunks
}

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Missing ANTHROPIC_API_KEY environment variable')
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      )
    }

    const { lineItems, numTrucks, allowStacking } = await req.json()

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty line items' },
        { status: 400 }
      )
    }

    if (!numTrucks || numTrucks < 1) {
      return NextResponse.json(
        { error: 'Invalid number of trucks' },
        { status: 400 }
      )
    }

    const TRUCKS_PER_CHUNK = 2 
    let allTrucks = []

    for (let i = 0; i < numTrucks; i += TRUCKS_PER_CHUNK) {
      const currentChunkSize = Math.min(TRUCKS_PER_CHUNK, numTrucks - i)
      
      const chunkPrompt = `As a logistics expert specializing in cardboard box shipments, optimize the loading of ${currentChunkSize} truck(s) (trucks ${i + 1} to ${i + currentChunkSize}). IMPORTANT: Stacking is ${allowStacking ? 'ALLOWED' : 'STRICTLY PROHIBITED - DO NOT STACK ANY PALLETS'}.

Standard Truck Dimensions:
- Interior Length: 52'7" (631 inches)
- Interior Width: 100 inches (fits 2 standard pallets side by side with proper spacing)
- Interior Height: 100 inches at nose, 112 inches at rear, 111 inches door opening

CRITICAL LOADING RULES:
1. Standard pallet size is 48" x 40" (width x depth)
2. Minimum 2" gap between pallets and walls
3. Minimum 4" gap between side-by-side pallets for forklift access
4. Load pallets in pairs (left and right) when possible
5. ${allowStacking ? 'Pallets may be stacked if needed' : 'NO STACKING ALLOWED - All pallets must be placed directly on the floor'}
6. Cardboard boxes may compress - ensure stable loading
7. Start loading from the front wall of the trailer
8. Leave minimum 6" between rows of pallets for forklift access

Items to load (all are palletized cardboard boxes):
${lineItems.map((item: any) => `
- Item #${item.item}:
  * Quantity: ${item.quantityOrdered} boxes
  * Box Dimensions: ${item.length}″ x ${item.width}″ x ${item.height}″
  * Total Pallets: ${item.totalPallets}
  * Boxes per pallet: ${item.qtyPerPallet}
  * Overhang: ${item.overhang}
  * Overhang both sides: ${item.overhangBothSides}
  * One side overhang: ${item.oneSideOverhang}″
  * Other side overhang: ${item.otherSideOverhang}″
`).join('\n')}

Format the response as JSON with the following structure:
{
  "trucks": [
    {
      "truckNumber": number,
      "loadingPlan": "Specific description of overall strategy",
      "sequence": [
        "1. Load Item #10202638 (2 pallets) at 0-4 feet from front, left side",
        "2. Load Item #10195770 (2 pallets) at 0-4 feet from front, right side"
      ],
      "itemPlacements": [
        {
          "itemNumber": "10202638",
          "palletCount": 2,
          "distanceFromFront": "0-4 feet",
          "side": "left",
          "stacked": false
        }
      ],
      "specialNotes": "Include specific height clearances and weight distribution notes",
      "spaceUtilization": "Percentage",
      "heightClearance": "Specific measurements at different points"
    }
  ]
}`

      const systemPrompt = `You are a logistics expert. Provide responses in pure JSON format only. ${
        allowStacking ? 'Stacking is allowed when appropriate.' : 'NEVER suggest stacking pallets - all pallets must be placed directly on the floor.'
      } Each string should be properly escaped.`

      const message = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4096,
        messages: [{ 
          role: "user", 
          content: chunkPrompt 
        }],
        system: systemPrompt
      })

      const textContent = message.content[0].type === 'text' ? message.content[0] : null
      if (!textContent) {
        throw new Error('Unexpected response format from Claude')
      }

      try {
        const sanitizedText = sanitizeJsonString(textContent.text)
        console.log('Raw response:', textContent.text) 
        
        let chunkResult
        try {
          chunkResult = JSON.parse(sanitizedText)
        } catch (parseError) {
          console.error('Parse error:', parseError)
          console.error('Attempted to parse:', sanitizedText)
          throw parseError
        }

        if (!chunkResult.trucks || !Array.isArray(chunkResult.trucks)) {
          throw new Error('Invalid response structure: missing trucks array')
        }

        allTrucks.push(...chunkResult.trucks)
      } catch (parseError) {
        console.error(`Error processing chunk ${i + 1}-${i + currentChunkSize}:`, parseError)
        throw parseError
      }
    }

    // Combine all results
    const finalResult = {
      trucks: allTrucks,
      summary: "Loading plan generated successfully",
      warnings: [
        "Ensure all pallets are properly secured",
        "Verify weight distribution before transport"
      ],
      recommendations: [
        "Follow loading sequence as specified",
        "Use appropriate securing equipment"
      ]
    }

    return NextResponse.json({ data: finalResult })
  } catch (error: any) {
    console.error('General error in optimize-loading:', error)
    return NextResponse.json(
      { 
        error: 'Failed to optimize loading',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
} 