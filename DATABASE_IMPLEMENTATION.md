# Database Integration Implementation - Task 8.3

This implementation integrates PostgreSQL database with TypeORM for the cart service.

## Database Schema

### Entities

#### CartEntity (`carts` table)
- `id` - Primary key, auto-generated (integer)
- `userId` - User identifier, not null (string)
- `status` - Enum: `OPEN` or `ORDERED`, defaults to `OPEN`
- `createdAt` - Timestamp when cart was created
- `updatedAt` - Timestamp when cart was last updated
- One-to-many relationship with `cart_items`

#### CartItemEntity (`cart_items` table)
- `id` - Primary key, auto-generated (integer)
- `cartId` - Foreign key to `carts.id`
- `productId` - Product identifier, not null (string)
- `count` - Number of items in cart (integer)
- Many-to-one relationship with `cart`

## Features Implemented

### 1. TypeORM Entities
- Created `CartEntity` and `CartItemEntity` with proper decorators
- Established relationships between entities
- Used existing `CartStatuses` enum from models

### 2. Database Service
- Updated `CartService` to use TypeORM repositories
- Implemented all CRUD operations:
  - `findByUserId()` - Get cart by user ID
  - `createByUserId()` - Create new cart for user
  - `findOrCreateByUserId()` - Find existing or create new cart
  - `updateByUserId()` - Update cart items
  - `removeByUserId()` - Delete cart
- Added proper error handling and null checks

### 3. Database Configuration
- Created `DatabaseConfigService` for flexible database configuration
- Supports both local development and AWS Lambda deployment
- AWS Secrets Manager integration for production credentials
- SSL configuration with `rejectUnauthorized: false` for non-production

### 4. Environment Variables
Updated `env.example` with required database configuration:

**Local Development:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=cartadmin
DB_PASSWORD=password
DB_NAME=cartdb
NODE_ENV=development
```

**AWS Lambda (automatically set by CDK):**
- `DB_SECRET_ARN` - ARN of AWS Secrets Manager secret
- `DB_HOST` - RDS endpoint
- `DB_PORT` - Database port
- `DB_NAME` - Database name

### 5. CDK Integration
The existing CDK stack already provides:
- PostgreSQL RDS instance
- VPC with proper security groups
- AWS Secrets Manager for credentials
- Lambda function with database environment variables

### 6. Module Configuration
- Updated `CartModule` to include TypeORM feature configuration
- Updated `AppModule` with async TypeORM configuration
- Added proper entity registration

## Usage

### Local Development
1. Set up local PostgreSQL database
2. Configure environment variables in `.env` file
3. Run `npm run start:dev`

### AWS Deployment
1. Deploy using CDK: `cdk deploy`
2. Database credentials are automatically managed via AWS Secrets Manager
3. Lambda function connects to RDS instance within VPC

## API Compatibility
The service maintains backward compatibility with existing API endpoints:
- `GET /api/profile/cart` - Get user cart items
- `PUT /api/profile/cart` - Update cart item
- `DELETE /api/profile/cart` - Clear user cart
- `PUT /api/profile/cart/order` - Checkout cart

## Testing
Updated test files with proper TypeORM repository mocks:
```bash
npm test -- --testPathPattern=cart.service.spec.ts
```