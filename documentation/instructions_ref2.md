## Documentation Phase: Project Overview

We’re in **documentation mode**. Using the `/docs` folder, produce **only** Markdown-based design docs—no code—covering processes, workflows, and architecture.

### 1. Project Scope

- **Server 1 (“frontend”)**  
  - **Stack**: Preact + Ionic React on a Cloudflare Worker (TypeScript)  
  - **Responsibilities**:  
    - Host client UI  
    - Integrate Supabase for auth / data  
    - Route management via React Router  
  - **Starter Template**: Cloudflare’s React (or Remix) Worker template, extended to support Preact and Ionic Capacitor  

- **Server 2 (“backend”)**  
  - **Stack**: Rust Worker on Cloudflare  
  - **Responsibilities**:  
    - OneSignal API integration for push notifications  
    - Business-logic endpoints consumed by the frontend  

### 2. Technology Research

Before documenting each component, review the latest stable versions and best practices for:

- [Supabase](https://supabase.com/docs)  
- [Cloudflare Workers (TypeScript)](https://developers.cloudflare.com/workers/)  
- [Cloudflare Workers (Rust)](https://developers.cloudflare.com/workers/reference/rust/)  
- [OneSignal API](https://documentation.onesignal.com/docs)  
- [Ionic React](https://ionicframework.com/docs/react)  
- [Preact](https://preactjs.com/guide/v10/getting-started)  
- [TypeScript](https://www.typescriptlang.org/docs/)  
- [Rust](https://doc.rust-lang.org/book/)

### 3. Repository Layout

```
/<repo-root>
│
├─ docs/               ← All Markdown design & workflow docs
│
├─ frontend/           ← Server 1: Preact + Ionic + TS Worker + Supabase
│   ├─ src/
│   └─ README.md       ← Architecture, module boundaries, Supabase flow
│
└─ backend/            ← Server 2: Rust Worker + OneSignal logic
    ├─ src/
    └─ README.md       ← Endpoint design, OneSignal integration steps
```

### 4. Architectural Goals

- **Modularity**: Shared utilities (e.g. types, validation) in `/shared` or via npm workspace  
- **Separation of Concerns**:  
  - UI vs business logic  
  - TypeScript vs Rust boundaries  
- **Industry-Standard Patterns**:  
  - Dependency injection (for service interfaces)  
  - Repository-service-controller layers  
  - Edge-optimized routing on Cloudflare Workers  

### 5. Next Steps

1. **Document**: For each server, draft a high-level architecture diagram and API/workflow sequence.  
2. **Detail**: Break down Supabase authentication flow and OneSignal push-notification sequence.  
3. **Review**: Ensure technology research links are cited and versions noted.