use worker::{Request, Response, Result, RouteContext};
use crate::models::{ApiResponse, ApiError};
use serde::Serialize;

#[derive(Serialize)]
struct ApiInfo {
    name: String,
    version: String,
    description: String,
}

#[derive(Serialize)]
struct TestData {
    message: String,
    endpoint: String,
    timestamp: String,
}

/// Handle API info requests
/// 
/// # Arguments
/// - `_req`: Request - The incoming HTTP request
/// - `_ctx`: RouteContext<()> - The route context
/// 
/// # Returns
/// Result<Response> - JSON response with API information
pub async fn api_info(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let api_info = ApiInfo {
        name: "myCookup Backend API".to_string(),
        version: "1.0.0".to_string(),
        description: "RESTful API for myCookup application".to_string(),
    };
    
    let response = ApiResponse::success(api_info);
    Response::from_json(&response)
}

/// Handle API test requests
/// 
/// # Arguments
/// - `_req`: Request - The incoming HTTP request
/// - `_ctx`: RouteContext<()> - The route context
/// 
/// # Returns
/// Result<Response> - JSON response with test data
pub async fn api_test(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    // Basic validation example
    if let Some(query) = req.url()?.query() {
        if query.contains("error") {
            let error = ApiError {
                code: "TEST_ERROR".to_string(),
                message: "This is a test error response".to_string(),
                field: Some("query".to_string()),
                details: Some("The 'error' parameter was found in the query string".to_string()),
            };
            
            let response = ApiResponse::<()>::single_error(error);
            return Response::from_json(&response);
        }
    }
    
    let test_data = TestData {
        message: "API test endpoint is working correctly".to_string(),
        endpoint: "/api/v1/test".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    
    let response = ApiResponse::success(test_data);
    Response::from_json(&response)
} 