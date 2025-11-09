# CSV Import/Export Feature

## Overview
This feature adds CSV import and export functionality for customer data in the CRM system.

## Implementation Details

### Backend Changes
- **Controller**: Added `exportCustomers` handler and CSV generation utilities
- **Routes**: Added `/api/customers/import` (POST) and `/api/customers/export` (GET)
- **Dependencies**: Added `csv-parse` and `multer` for CSV processing and file uploads

### Frontend Changes
- **UI**: Added Import/Export buttons with visual feedback on Customers page
- **Features**: 
  - File upload with progress indicator
  - Download filtered CSV exports
  - Success/error notifications with details

### CSV Format
Required columns:
- `externalCustomerId` (unique identifier)
- `name` (customer name)
- `email` (valid email address)

Optional columns:
- `phone`, `totalSpend`, `visitCount`, `lastOrderDate`
- `tags` (semicolon-separated)
- `attributes` (JSON string)

### Testing
Comprehensive test suite covering:
- Valid CSV import (all fields & required only)
- Error handling (missing headers, invalid data, empty files)
- Export with filters
- Round-trip (export → import)
- Idempotent re-imports

## Usage

### Import CSV
```bash
curl -X POST http://localhost:5000/api/customers/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@customers.csv"
```

### Export CSV
```bash
curl -X GET "http://localhost:5000/api/customers/export?minSpend=1000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o customers-export.csv
```

### Example CSV
```csv
externalCustomerId,name,email,phone,totalSpend,visitCount,lastOrderDate,tags,attributes
cust001,John Doe,john@example.com,555-1234,5000,10,2024-11-01,premium;vip,"{""tier"":""gold""}"
cust002,Jane Smith,jane@example.com,555-5678,3000,5,2024-10-15,regular,"{""tier"":""silver""}"
```

## CI/CD Pipeline

### Workflow Triggers
- Push to `main`, `develop`, or any `feature/*` branch
- Pull requests to `main` or `develop`

### Jobs
1. **Server Tests**: Run Jest tests on Node 18 & 20
2. **Client Build**: Build React app on Node 18 & 20
3. **Integration Tests**: Run CSV-specific tests with MongoDB
4. **Security Audit**: Check dependencies for vulnerabilities
5. **Build Summary**: Aggregate results

### Running Locally
```bash
# Server tests
cd ma-sharvari-ki-jai/server
npm ci
npm test

# Client build
cd ma-sharvari-ki-jai/client
npm ci
npm run build
```

## Next Steps
1. ✅ Implement CSV import/export endpoints
2. ✅ Add comprehensive tests
3. ✅ Create UI components
4. ✅ Set up CI/CD pipeline
5. ⏳ Create pull request to main
6. ⏳ Code review and merge
