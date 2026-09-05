import { Link } from "react-router-dom";
import "../components/ui/ui.css";

const NotFound = () => {
  return (
    <main className="marketing-page">
      <p className="eyebrow">Page not found</p><h1>404</h1><p className="marketing-lead">This page is not part of the Orion booking service.</p>
      <Link to="/home" className="ui-button ui-button--primary">Go home</Link>
    </main>
  );
};

export default NotFound;
