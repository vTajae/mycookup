# myCookup Backend

## Overview
The backend service is built with Rust and deployed on Cloudflare Workers. It provides high-performance API endpoints, handles business logic, and integrates with external services like OneSignal for push notifications.

## Technology Stack
- **Language**: Rust 1.84.x (2024 Edition)
- **Framework**: worker crate (workers-rs)
- **Runtime**: Cloudflare Workers (WASM)
- **Database**: Supabase (Server-side operations)
- **Push Notifications**: OneSignal REST API
- **Serialization**: serde (JSON handling)
- **HTTP Client**: reqwest (with WASM support)

## Project Structure
```
backend/
├── src/
│   ├── handlers/             # HTTP request handlers
│   │   ├── auth.rs          # Authentication endpoints
│   │   ├── recipes.rs       # Recipe management endpoints
│   │   ├── notifications.rs # Push notification endpoints
│   │   ├── health.rs        # Health check endpoints
│   │   └── mod.rs           # Handler module exports
│   ├── services/            # Business logic services
│   │   ├── auth_service.rs  # Authentication business logic
│   │   ├── recipe_service.rs # Recipe management logic
│   │   ├── notification_service.rs # Notification logic
│   │   └── mod.rs           # Service module exports
│   ├── models/              # Data structures and validation
│   │   ├── user.rs          # User data models
│   │   ├── recipe.rs        # Recipe data models
│   │   ├── notification.rs  # Notification data models
│   │   ├── response.rs      # API response models
│   │   └── mod.rs           # Model module exports
│   ├── integrations/        # External service clients
│   │   ├── supabase.rs      # Supabase client integration
│   │   ├── onesignal.rs     # OneSignal API client
│   │   └── mod.rs           # Integration module exports
│   ├── utils/               # Utility functions
│   │   ├── validation.rs    # Input validation utilities
│   │   ├── error.rs         # Error handling utilities
│   │   ├── auth.rs          # Authentication utilities
│   │   └── mod.rs           # Utility module exports
│   ├── lib.rs               # Library entry point
│   └── main.rs              # Worker entry point
├── wrangler.toml            # Cloudflare Worker configuration
├── Cargo.toml               # Rust dependencies and metadata
├── Cargo.lock               # Dependency lock file
└── README.md                # This file
```

## Getting Started

### Prerequisites
- Rust 1.84+ with wasm32-unknown-unknown target
- Wrangler CLI for Cloudflare Workers
- Supabase project with service role key
- OneSignal account and API keys

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd myCookup/backend

# Install Rust WASM target
rustup target add wasm32-unknown-unknown

# Install dependencies
cargo build

# Copy environment configuration
cp .env.example .env
```

### Environment Configuration
Create `.env` file with the following variables:
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OneSignal Configuration
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key

# Application Configuration
ENVIRONMENT=development
LOG_LEVEL=info
```

### Development
```bash
# Start development server
wrangler dev

# Run tests
cargo test

# Check code formatting
cargo fmt --check

# Run clippy lints
cargo clippy

# Build for production
cargo build --release --target wasm32-unknown-unknown
```

### Deploy
```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Deploy to staging
wrangler deploy --env staging

# View logs
wrangler tail
```

## Architecture

### Request Flow
```
HTTP Request
    ↓
Router (worker crate)
    ↓
Handler (auth, validation)
    ↓
Service (business logic)
    ↓
Integration (external APIs)
    ↓
Response (JSON)
```

### Dependency Injection
```rust
pub struct AppState {
    pub supabase_client: SupabaseClient,
    pub onesignal_client: OneSignalClient,
    pub config: AppConfig,
}

impl AppState {
    pub fn new(env: &Env) -> Result<Self> {
        Ok(Self {
            supabase_client: SupabaseClient::new(env)?,
            onesignal_client: OneSignalClient::new(env)?,
            config: AppConfig::from_env(env)?,
        })
    }
}
```

## API Endpoints

### Authentication Endpoints
```rust
// POST /api/v1/auth/verify
// Verify JWT token and return user info
pub async fn verify_token(req: Request, ctx: RouteContext<AppState>) -> Result<Response> {
    let token = extract_bearer_token(&req)?;
    let user = ctx.data.supabase_client.verify_token(&token).await?;
    
    Response::from_json(&ApiResponse::success(user))
}
```

### Recipe Management
```rust
// GET /api/v1/recipes
pub async fn get_recipes(req: Request, ctx: RouteContext<AppState>) -> Result<Response> {
    let user = authenticate_user(&req, &ctx.data).await?;
    let recipes = ctx.data.recipe_service.get_user_recipes(user.id).await?;
    
    Response::from_json(&ApiResponse::success(recipes))
}

// POST /api/v1/recipes
pub async fn create_recipe(mut req: Request, ctx: RouteContext<AppState>) -> Result<Response> {
    let user = authenticate_user(&req, &ctx.data).await?;
    let recipe_data: CreateRecipeRequest = req.json().await?;
    
    let recipe = ctx.data.recipe_service.create_recipe(user.id, recipe_data).await?;
    
    Response::from_json(&ApiResponse::success(recipe))
}
```

### Push Notifications
```rust
// POST /api/v1/notifications/send
pub async fn send_notification(mut req: Request, ctx: RouteContext<AppState>) -> Result<Response> {
    let user = authenticate_user(&req, &ctx.data).await?;
    let notification_data: SendNotificationRequest = req.json().await?;
    
    let result = ctx.data.onesignal_client
        .send_notification(notification_data)
        .await?;
    
    Response::from_json(&ApiResponse::success(result))
}
```

## Data Models

### User Model
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Recipe Model
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Recipe {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub description: Option<String>,
    pub ingredients: Vec<Ingredient>,
    pub instructions: Vec<String>,
    pub prep_time: Option<i32>,
    pub cook_time: Option<i32>,
    pub servings: Option<i32>,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Ingredient {
    pub name: String,
    pub amount: String,
    pub unit: Option<String>,
}
```

### API Response Model
```rust
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub meta: ResponseMeta,
    pub errors: Vec<ApiError>,
}

#[derive(Debug, Serialize)]
pub struct ResponseMeta {
    pub timestamp: DateTime<Utc>,
    pub version: String,
    pub request_id: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            meta: ResponseMeta::new(),
            errors: vec![],
        }
    }
    
    pub fn error(errors: Vec<ApiError>) -> Self {
        Self {
            success: false,
            data: None,
            meta: ResponseMeta::new(),
            errors,
        }
    }
}
```

## External Integrations

### Supabase Integration
```rust
pub struct SupabaseClient {
    base_url: String,
    service_role_key: String,
    client: reqwest::Client,
}

impl SupabaseClient {
    pub async fn verify_token(&self, token: &str) -> Result<User> {
        let response = self.client
            .get(&format!("{}/auth/v1/user", self.base_url))
            .bearer_auth(token)
            .send()
            .await?;
            
        let user: User = response.json().await?;
        Ok(user)
    }
    
    pub async fn get_user_recipes(&self, user_id: &str) -> Result<Vec<Recipe>> {
        let response = self.client
            .get(&format!("{}/rest/v1/recipes", self.base_url))
            .header("apikey", &self.service_role_key)
            .header("Authorization", format!("Bearer {}", self.service_role_key))
            .query(&[("user_id", format!("eq.{}", user_id))])
            .send()
            .await?;
            
        let recipes: Vec<Recipe> = response.json().await?;
        Ok(recipes)
    }
}
```

### OneSignal Integration
```rust
pub struct OneSignalClient {
    app_id: String,
    rest_api_key: String,
    client: reqwest::Client,
}

impl OneSignalClient {
    pub async fn send_notification(&self, notification: SendNotificationRequest) -> Result<NotificationResponse> {
        let payload = json!({
            "app_id": self.app_id,
            "headings": {"en": notification.title},
            "contents": {"en": notification.message},
            "included_segments": notification.segments,
            "data": notification.data
        });
        
        let response = self.client
            .post("https://onesignal.com/api/v1/notifications")
            .header("Authorization", format!("Basic {}", self.rest_api_key))
            .json(&payload)
            .send()
            .await?;
            
        let result: NotificationResponse = response.json().await?;
        Ok(result)
    }
}
```

## Error Handling

### Error Types
```rust
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub field: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),
    
    #[error("Validation failed: {0}")]
    ValidationError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("External service error: {0}")]
    ExternalServiceError(String),
    
    #[error("Internal server error: {0}")]
    InternalError(String),
}

impl From<AppError> for Response {
    fn from(error: AppError) -> Self {
        let (status_code, api_error) = match error {
            AppError::AuthenticationError(msg) => (401, ApiError {
                code: "AUTHENTICATION_ERROR".to_string(),
                message: msg,
                field: None,
                details: None,
            }),
            AppError::ValidationError(msg) => (400, ApiError {
                code: "VALIDATION_ERROR".to_string(),
                message: msg,
                field: None,
                details: None,
            }),
            // ... other error mappings
        };
        
        Response::from_json(&ApiResponse::<()>::error(vec![api_error]))
            .unwrap()
            .with_status(status_code)
    }
}
```

## Testing

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_create_recipe() {
        let recipe_data = CreateRecipeRequest {
            title: "Test Recipe".to_string(),
            description: Some("A test recipe".to_string()),
            ingredients: vec![],
            instructions: vec![],
        };
        
        let result = create_recipe_logic(recipe_data).await;
        assert!(result.is_ok());
    }
}
```

### Integration Tests
```bash
# Run all tests
cargo test

# Run specific test
cargo test test_create_recipe

# Run tests with output
cargo test -- --nocapture
```

## Performance Optimization

### WASM Optimization
```toml
[profile.release]
opt-level = "s"          # Optimize for size
lto = true               # Link-time optimization
codegen-units = 1        # Single codegen unit
panic = "abort"          # Abort on panic
strip = true             # Strip debug symbols
```

### Memory Management
- Use `Box` for large data structures
- Implement `Drop` for resource cleanup
- Avoid unnecessary allocations
- Use string slices (`&str`) when possible

### Async Performance
- Use `tokio::spawn` for concurrent operations
- Implement connection pooling
- Cache frequently accessed data
- Use streaming for large responses

## Security

### Authentication
- Verify JWT tokens on every request
- Implement proper CORS headers
- Validate all input data
- Use secure headers

### Input Validation
```rust
pub fn validate_email(email: &str) -> Result<(), ValidationError> {
    if email.is_empty() {
        return Err(ValidationError::new("Email is required"));
    }
    
    if !email.contains('@') {
        return Err(ValidationError::new("Invalid email format"));
    }
    
    Ok(())
}
```

## Monitoring and Logging

### Structured Logging
```rust
use log::{info, warn, error};

pub async fn handle_request(req: Request) -> Result<Response> {
    let request_id = generate_request_id();
    
    info!("Processing request: {}", request_id);
    
    match process_request(req).await {
        Ok(response) => {
            info!("Request completed successfully: {}", request_id);
            Ok(response)
        }
        Err(e) => {
            error!("Request failed: {} - {}", request_id, e);
            Err(e)
        }
    }
}
```

---

**Last Updated**: June 17, 2025  
**Maintainer**: Backend Team
