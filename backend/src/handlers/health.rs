use worker::{Request, Response, Result, RouteContext};
use crate::models::ApiResponse;
use serde::Serialize;

#[derive(Serialize)]
struct HealthStatus {
    status: String,
    service: String,
}

/// Handle health check requests
/// 
/// # Arguments
/// - `_req`: Request - The incoming HTTP request
/// - `_ctx`: RouteContext<()> - The route context
/// 
/// # Returns
/// Result<Response> - JSON response indicating service health status
pub async fn health_check(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let health_data = HealthStatus {
        status: "healthy".to_string(),
        service: "myCookup Backend API".to_string(),
    };
    
    let response = ApiResponse::success(health_data);
    Response::from_json(&response)
} 