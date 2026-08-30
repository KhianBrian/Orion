import { useRoutes } from "react-router-dom";
import { routeConfig } from "./routes/routeConfig";
import "./App.css";

function App() {
  const element = useRoutes(routeConfig);
  return element;
}

export default App;
