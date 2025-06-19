use worker::*;

mod handlers;
mod models;

use handlers::{api_info, api_test, health_check};

/// Main worker entry point for handling fetch events
/// 
/// # Arguments
/// - `req`: Request - The incoming HTTP request
/// - `env`: Env - Environment variables and bindings
/// - `_ctx`: Context - Worker context
/// 
/// # Returns
/// Result<Response> - HTTP response or worker error
#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    console_log!("Worker started, handling request to: {}", req.path());
    
    let router = Router::new();

    router
        .get("/", |_req, _ctx| {
            Response::ok("Welcome to myCookup Backend API")
        })
        .get_async("/health", health_check)
        .get_async("/api/v1/info", api_info)
        .get_async("/api/v1/test", api_test)
        .run(req, env)
        .await
}
