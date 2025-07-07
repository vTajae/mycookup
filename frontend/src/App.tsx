import { BrowserRouter, Routes, Route } from "react-router";
import { Home, Notifications } from "./routes";
import { DebugLogs } from "./routes/debug-logs";
import { RemoteDebugTest } from "./components/RemoteDebugTest";
import { MobileDebugConsole } from "./components/MobileDebugConsole";
import LogsAPI, { action as logsAction, loader as logsLoader } from "./routes/api.logs";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/debug" element={<RemoteDebugTest />} />
        <Route path="/debug-logs" element={<DebugLogs />} />
        <Route
          path="/api/logs"
          element={<LogsAPI />}
          action={logsAction}
          loader={logsLoader}
        />
      </Routes>
      {/* Mobile Debug Console - always available */}
      <MobileDebugConsole />
    </BrowserRouter>
  );
}
