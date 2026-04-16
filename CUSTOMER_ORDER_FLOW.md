# WEB-05: Customer Portal - New Order Flow

## Overview

This document describes the implementation of the customer order creation flow for the fabrix-web frontend (WEB-05).

## User Flow

The customer order creation flow is a 3-step process:

1. **Upload Model** - Upload STL file with validation
2. **Configure Job** - Set job name, description, and select printer
3. **Review & Submit** - Review all settings and create the job

After successful creation, the customer is redirected to the job detail page showing the order confirmation.

## Components

### STLFileUpload (`components/customer/stl-file-upload.tsx`)

Handles file selection and validation.

**Features**:
- Drag-and-drop file upload
- Click to browse file picker
- STL file type validation (.stl, application/sla, model/stl, application/x-stl)
- File size validation (max 500MB)
- Visual feedback (file selected confirmation)
- Error messages for invalid files

**Props**:
```typescript
interface FileUploadProps {
  onFileSelect: (file: File, fileId?: string) => void;
  isLoading?: boolean;
}
```

### PrinterSelection (`components/customer/printer-selection.tsx`)

Displays available online printers for assignment.

**Features**:
- Fetches available printers from backend
- Filters to show only online printers
- Radio button selection
- Displays printer metadata (capabilities, model, etc.)
- Optional printer assignment
- Shows "no printers available" message when needed

**Props**:
```typescript
interface PrinterSelectionProps {
  printers: PrinterOption[];
  selectedPrinterId?: string;
  onPrinterSelect: (printerId: string) => void;
  isLoading?: boolean;
}
```

### CreateJobForm (`components/customer/create-job-form.tsx`)

Main multi-step form component orchestrating the entire flow.

**Features**:
- 3-step wizard with progress indicators
- File upload with auto-upload to backend
- Job configuration (name, description)
- Printer selection
- Review summary before submission
- Form validation using Zod + React Hook Form
- Loading states and error handling
- Auto-redirect to job detail on success

**Steps**:
1. Upload - STL file upload
2. Configure - Job details and printer selection
3. Submit - Review and final submission

### JobDetailView (`components/customer/job-detail-view.tsx`)

Displays job details after creation.

**Features**:
- Shows job status with visual indicators
- Displays file information (name, size, MIME type)
- Shows printer assignment status
- Displays print settings metadata
- Success message confirmation
- Navigation back to dashboard or all jobs
- Loading and error states

## Pages

### Customer Dashboard (`app/(dashboard)/dashboard/customer/page.tsx`)

Main customer dashboard showing all jobs.

**Features**:
- List of customer's all jobs
- Job status indicators with color coding
- Quick view of job details (file, size, created date)
- "New Job" button to start creating
- Empty state when no jobs exist
- Loading and error states

**Route**: `/dashboard/customer`

### Create Job Page (`app/(dashboard)/dashboard/customer/jobs/create/page.tsx`)

Page that contains the CreateJobForm component.

**Route**: `/dashboard/customer/jobs/create`

### Job Detail Page (`app/(dashboard)/dashboard/customer/jobs/[id]/page.tsx`)

Page that displays job details after creation or when viewing a specific job.

**Route**: `/dashboard/customer/jobs/:id`

## API Integration

### API Client (`lib/api/customer-jobs.ts`)

Provides typed API functions for all job-related endpoints.

**Functions**:

```typescript
// Fetch available printers
fetchAvailablePrinters(): Promise<AvailablePrinters>

// Upload STL file
uploadSTL(file: File): Promise<UploadSTLResponse>

// Create new job
createJob(request: CreateJobRequest): Promise<JobDetail>

// Get job details
getJobDetail(jobId: string): Promise<JobDetail>

// List customer's jobs
listCustomerJobs(): Promise<{ jobs: JobDetail[]; count: number }>
```

**Endpoints Called**:
- `GET /customer/printers` - Fetch available printers
- `POST /customer/jobs/upload` - Upload STL file
- `POST /customer/jobs` - Create job
- `GET /customer/jobs/me` - List customer's jobs
- `GET /customer/jobs/:id` - Get job details

## Type Definitions

### PrinterOption
```typescript
{
  id: string;
  nodeId: string;
  displayName: string;
  status: 'online' | 'offline';
  activityState: 'idle' | 'working' | 'offline';
  lastHeartbeatAt: string | null;
  options?: Record<string, unknown>;
}
```

### JobDetail
```typescript
{
  id: string;
  name: string;
  description: string | null;
  status: string;
  fileId: string;
  customerId: string;
  printerId: string | null;
  file: JobFile;
  metadata: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### CreateJobRequest
```typescript
{
  fileId: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}
```

## Routes Updated

Added to `lib/routes.ts`:
```typescript
dashboardAreas: {
  // ... existing routes
  customerJobs: '/dashboard/customer/jobs' as Route,
  customerCreateJob: '/dashboard/customer/jobs/create' as Route,
}
```

## Features

### File Upload
- ✅ Drag-and-drop support
- ✅ Click to browse
- ✅ STL file type validation
- ✅ 500MB size limit
- ✅ SHA256 checksum calculation (backend)
- ✅ Auto-upload to backend

### Printer Selection
- ✅ Fetch available online printers
- ✅ Display printer capabilities/metadata
- ✅ Optional printer assignment
- ✅ Shows activity state (idle/working)
- ✅ "No printers available" handling

### Job Creation
- ✅ Validate job name
- ✅ Optional description
- ✅ Multi-step form with progress
- ✅ Review summary before submission
- ✅ Form validation (Zod + React Hook Form)

### Job Tracking
- ✅ List all customer jobs
- ✅ View job details
- ✅ Status indicators with colors
- ✅ File information display
- ✅ Printer assignment info

## Error Handling

- ✅ Network errors with toast notifications
- ✅ File validation errors (type, size)
- ✅ Job not found (404)
- ✅ Ownership verification
- ✅ Loading states for all async operations
- ✅ User-friendly error messages

## UI/UX Features

- ✅ Progress indicators for multi-step form
- ✅ Color-coded status badges
- ✅ Empty state messaging
- ✅ Loading spinners
- ✅ Toast notifications for feedback
- ✅ Responsive design (Tailwind CSS)
- ✅ Hover states and transitions
- ✅ Back/navigation buttons
- ✅ Disabled states during loading

## State Management

- React hooks (useState, useEffect)
- React Hook Form for form state
- Zod for runtime validation
- Toast notifications (react-hot-toast)
- useRouter for navigation
- useParams for dynamic routes

## Dependencies Used

- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod resolver for form validation
- `zod` - Schema validation
- `axios` - HTTP client
- `react-hot-toast` - Toast notifications
- `lucide-react` - Icons
- `next/navigation` - Next.js navigation

## Testing Checklist

- [ ] File upload validates STL files only
- [ ] File size validation (500MB limit)
- [ ] Drag-and-drop works correctly
- [ ] Printer list loads and displays correctly
- [ ] Form validation works (name required)
- [ ] Job creation succeeds and redirects
- [ ] Job detail page loads created job
- [ ] Customer dashboard shows all jobs
- [ ] Job status colors display correctly
- [ ] Error states show appropriate messages
- [ ] Loading states display correctly
- [ ] Navigation between pages works

## Future Enhancements

- [ ] File preview/visualization (3D model viewer)
- [ ] Print time estimation
- [ ] Cost estimation
- [ ] Print quality presets (fine/normal/fast)
- [ ] Material selection
- [ ] Support/infill percentage presets
- [ ] Job history and archiving
- [ ] Duplicate/clone existing job
- [ ] Download/export job details
- [ ] Printer-specific settings per printer
- [ ] Advanced print settings editor
- [ ] Slicing preview
- [ ] Print progress tracking/live updates
- [ ] Estimated print time countdown
- [ ] Download printed file when ready
