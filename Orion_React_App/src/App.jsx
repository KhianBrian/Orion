import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { routeConfig } from "./routes/routeConfig";
import { StatusMessage } from "./components/ui/StatusMessage";
import "./App.css";

function App() {
  const element = useRoutes(routeConfig);
  return <Suspense fallback={<StatusMessage>Loading…</StatusMessage>}>{element}</Suspense>;
}

export default App;
