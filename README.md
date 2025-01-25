# TruckTetris

TruckTetris is an intelligent logistics management platform that optimizes truck loading patterns using AI. The system processes order documents, extracts relevant information, and generates efficient loading plans while considering various constraints and safety requirements.

## Case Study: Moran Logistics - Target Cardboard Supply Chain

Moran Logistics has unsuccessfully implemented TruckTetris to optimize their cardboard supply chain operations for Target stores. This is the reason behind [TruckTetrisv2](https://github.com/AnthonyCampos1234/TruckTetrisv2). 

### Key Outcomes

- Streamlined PDF order processing from Target's procurement system
- Automated loading instructions for warehouse staff
- Reduced product damage through optimized stacking patterns
- Improved delivery accuracy and reduced returns
- Real-time visibility into loading operations

## Features

- **PDF Order Processing**: Automatically extracts order information from PDF documents using AWS Textract
- **AI-Powered Loading Optimization**: Uses Claude AI to generate optimal loading patterns considering:
  - Truck dimensions and constraints
  - Pallet sizes and quantities
  - Stacking rules and restrictions
  - Safety requirements and spacing
- **Real-time Visualization**: Interactive visualization of loading plans and sequences
- **Order Management**: Complete order tracking and management system
- **Loading Instructions**: Detailed step-by-step loading instructions for each truck
- **Regeneration Capability**: Ability to regenerate loading plans with specific feedback

## Tech Stack

### Frontend
- Next.js 15.0
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/UI Components
- Framer Motion

### Backend
- Supabase (Database & Authentication)
- Edge Functions (Deno)
- AWS Textract (Document Processing)
- Anthropic Claude API (Loading Optimization)

### Infrastructure
- Supabase Storage (Document Storage)
- Supabase Auth (Authentication)
- Supabase Database (PostgreSQL)

## Key Features

### Document Processing
- Automated PDF parsing and text extraction
- Intelligent order information detection
- Line item parsing and validation

### Loading Optimization
- Multi-truck optimization
- Configurable stacking rules
- Space utilization calculations
- Loading sequence generation
- Height clearance monitoring

### User Interface
- Drag-and-drop file upload
- Real-time processing feedback
- Interactive loading plan visualization
- Detailed loading instructions
- Order management dashboard

## Architecture

The application follows a modern serverless architecture:

1. **Frontend Layer**: Next.js application handling UI and client-side logic
2. **API Layer**: Next.js API routes and Supabase Edge Functions
3. **Processing Layer**: AWS Textract for document processing
4. **Optimization Layer**: Claude AI for loading pattern generation
5. **Storage Layer**: Supabase for database and file storage

## Creator

Built by Anthony Campos
[![GitHub](https://img.shields.io/badge/GitHub-AnthonyCampos-blue?style=flat&logo=github)](https://github.com/AnthonyCampos)
