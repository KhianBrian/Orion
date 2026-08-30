import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./Layout.css";

const Layout = () => {
  return (
    <div className="orion-layout">
      <Navbar />

      <main className="orion-main">
        <Outlet />
      </main>

      <Footer />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
      />
    </div>
  );
};

export default Layout;
