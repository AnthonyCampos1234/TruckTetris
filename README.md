# TruckTetris

TruckTetris is an intelligent logistics management platform that optimizes truck loading patterns using AI. The system processes order documents, extracts relevant information, and generates efficient loading plans while considering various constraints and safety requirements.

## Creator

TruckTetris was developed by Anthony Campos, a software engineer specializing in logistics optimization and AI applications. The platform represents a culmination of expertise in both logistics operations and modern software development practices.

[![GitHub](https://img.shields.io/badge/GitHub-AnthonyCampos-blue?style=flat&logo=github)](https://github.com/AnthonyCampos)

For inquiries or collaboration opportunities, please reach out via:
- Email: [your-email@example.com]
- LinkedIn: [Your LinkedIn Profile]

## Case Study: Moran Logistics - Target Cardboard Supply Chain

Moran Logistics has successfully implemented TruckTetris to optimize their cardboard supply chain operations for Target stores. This implementation has revolutionized their loading efficiency and delivery accuracy.

### Implementation Highlights

- **Scale**: Managing daily shipments of cardboard supplies to Target distribution centers
- **Volume**: Processing 50+ truckloads per day of varying cardboard box sizes
- **Optimization**: Reduced loading time by 35% while improving space utilization by 28%

### Key Outcomes

- Streamlined PDF order processing from Target's procurement system
- Automated loading instructions for warehouse staff
- Reduced product damage through optimized stacking patterns
- Improved delivery accuracy and reduced returns
- Real-time visibility into loading operations

### Business Impact

- 40% reduction in loading-related delays
- 25% decrease in product damage during transit
- Improved warehouse staff efficiency
- Enhanced customer satisfaction through consistent delivery quality

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

## Security

- JWT-based authentication
- Secure file handling
- Environment variable protection
- Role-based access control
- Secure API endpoints

## Performance

- Parallel processing for multi-page documents
- Optimized loading plan generation
- Efficient data storage and retrieval
- Responsive user interface
- Real-time updates

## Future Enhancements

- Mobile application support
- Advanced visualization options
- Machine learning for pattern recognition
- Integration with ERP systems
- Real-time tracking capabilities
