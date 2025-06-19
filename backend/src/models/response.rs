use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub field: Option<String>,
    pub details: Option<String>,
}

impl ResponseMeta {
    /// Create a new ResponseMeta instance with current timestamp
    /// 
    /// # Returns
    /// ResponseMeta - A new metadata instance with timestamp, version, and request ID
    pub fn new() -> Self {
        Self {
            timestamp: Utc::now(),
            version: "1.0.0".to_string(),
            request_id: Uuid::new_v4().to_string(),
        }
    }
}

impl Default for ResponseMeta {
    /// Create default ResponseMeta instance
    /// 
    /// # Returns
    /// ResponseMeta - Default metadata with current timestamp
    fn default() -> Self {
        Self::new()
    }
}

impl<T> ApiResponse<T> {
    /// Create a successful API response
    /// 
    /// # Arguments
    /// - `data`: T - The response data payload
    /// 
    /// # Returns
    /// ApiResponse<T> - Success response with provided data
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            meta: ResponseMeta::new(),
            errors: vec![],
        }
    }

    /// Create an error API response
    /// 
    /// # Arguments
    /// - `errors`: Vec<ApiError> - Vector of API errors
    /// 
    /// # Returns
    /// ApiResponse<T> - Error response with no data
    pub fn error(errors: Vec<ApiError>) -> Self {
        Self {
            success: false,
            data: None,
            meta: ResponseMeta::new(),
            errors,
        }
    }

    /// Create a single error API response
    /// 
    /// # Arguments
    /// - `error`: ApiError - Single API error
    /// 
    /// # Returns
    /// ApiResponse<T> - Error response with single error
    pub fn single_error(error: ApiError) -> Self {
        Self::error(vec![error])
    }
} 