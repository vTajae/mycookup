We are in the documentation phase use the/docs folder to thoroughly document. The project processes and workflows do not do any coding strictly documentation use markdown format.

Server 1 Typescript:
Here are the specs of the project we’re going to use a Cloudflare type script worker with supabase. The script worker will be in the flavor of preact framework. So we’ll have the pre-act framework as the base framework then we’ll throw ionic react into that base project that will be hosted or deployed with the latest version of Cloudflare worker consider react, router template as a possible, starting point as long as it supports, pre-react and react, ionic capacitor.
This system will contain the base of the application is it will utilize supabase.

Server 2: 
This system will use a react rust worker, and will contain the unique logic for the application. For example, we will be using the one signal API, and the back in logic to interact with our one signal account will be written in rust and the The script application will make request requests to server to here.


I want to use the latest versions of everything that is stable and supported be sure to research the following technologies before applying any thing to our project documentation:

Supabase
Cloudflare Worker - Typescript and Rust
One signal
Ionic react
Preact
Typescript
Rust

============

The repository will contain both servers however each environment should be isolated so each folder should represent each serve server call them front end and back end back in will contain the rust server. Front end will contain the type script, worker and super base implementation.

I need extra emphasis on an effective optimized modern architecture within each server as there will be shared features and I want to promote as much modularization as possible, so consider high-level industry standard design patterns.
I do prefer the repository service route architecture however I’m willing to challenge myself to use a better more optimal approach for this solution .