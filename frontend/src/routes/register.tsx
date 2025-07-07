// import { useState } from "react";
// import { useActionData } from "@remix-run/react";
// import { json, ActionFunction, Session } from "@remix-run/cloudflare";
// import UserService from "api_v2/services/userService";
// import { userRegister } from "api_v2/types/user";

// interface ActionData {
//   error?: string;
// }

// export const action: ActionFunction = async ({ request, context }) => {
//   const mySession = context.session as Session;

//   const myEnv = context.cloudflare.env as Env;


//   // Now you can access your env with the correct type

//   const userService = new UserService(myEnv);

//   const formData = await request.formData();
//   const actionType = formData.get("actionType");
//   // const userService = new UserService(env);

//   if (actionType === "register") {
//     const userData = {
//       username: formData.get("username"),
//       password: formData.get("password"),
//       role: formData.get("role"),
//     } as userRegister;

//     const loginResult = await userService.registerUser(userData);


//     if (loginResult.success) {
//       // Create a new session and set login data
//       // Respond with a redirect and set the session cookie
//       return new Response(null, {
//         status: 303, // or 302, depending on your use case
//         headers: {
//           Location: "/a/login",
//         },
//       });
//     } else {
//       // Handle login failure (e.g., return an error message)
//       mySession.flash("error", "Invalid username or password.");

//       return new Response(null, {
//         status: 403,
//         headers: {
//           Location: "/a/register",
//         },
//       });
//     }
//   } else {
//     // Fallback for invalid action type
//     return json({ error: "Something went wrong." });
//   }
// };

// const Register = () => {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [role, setRole] = useState(""); // Add role state if needed for registration
//   const [actionType, setActionType] = useState("register"); // Toggle between login and register
//   const actionData = useActionData<ActionData>();

//   return (
//     <>
//       <h1 className="text-center text-3xl font-bold text-black mt-8">Register</h1>

//       <form
//         action="/a/register"
//         method="post"
//         className="max-w-lg mx-auto mt-2 p-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-2xl"
//       >
//         {/* Toggle Form Action */}
//         <input type="hidden" name="actionType" value={actionType} />

//         <div className="mb-6">
//           <label
//             htmlFor="username"
//             className="block text-gray-300 text-base font-semibold mb-2"
//           >
//             Email
//           </label>
//           <input
//             type="text"
//             name="username"
//             id="username"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             className="shadow appearance-none border-2 border-gray-700 rounded-lg w-full py-3 px-4 text-white bg-gray-800 leading-tight focus:outline-none focus:border-blue-500"
//             placeholder="Enter your email"
//           />
//         </div>

//         <div className="mb-6">
//           <label
//             htmlFor="password"
//             className="block text-gray-300 text-base font-semibold mb-2"
//           >
//             Password
//           </label>
//           <input
//             type="password"
//             name="password"
//             id="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="shadow appearance-none border-2 border-gray-700 rounded-lg w-full py-3 px-4 text-white bg-gray-800 mb-3 leading-tight focus:outline-none focus:border-blue-500"
//             placeholder="Enter your password"
//           />
//         </div>

//         {actionType === "register" && (
//           // Add additional fields for registration as needed
//           <div className="mb-6">
//             <label
//               htmlFor="role"
//               className="block text-gray-300 text-base font-semibold mb-2"
//             >
//               Role
//             </label>
//             <select
//               name="role"
//               id="role"
//               value={role}
//               onChange={() => setRole("2")}
//               className="shadow border-2 border-gray-700 rounded-lg w-full py-3 px-4 bg-gray-800 text-white leading-tight focus:outline-none focus:border-blue-500"
//             >
//               <option value="">Select a role</option>
//               <option value="1">User</option>
//               <option value="2">Admin</option>
//             </select>
//           </div>
//         )}

//         {actionData?.error && (
//           <div className="text-red-500 text-xs italic">{actionData.error}</div>
//         )}

//         <div className="flex items-center justify-between space-x-4">
//           <button
//             className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105"
//             type="submit"
//             onClick={() => setActionType("register")}
//           >
//             Register
//           </button>
//         </div>
//       </form>
//     </>
//   );
// };

// export default Register;