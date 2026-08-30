import { Outlet, Link, useLocation } from "react-router-dom";
import "../components/SidebarLayout.css";

const Profile = () => {
  const location = useLocation();
  const isSettings = location.pathname.includes("/profile/abs");

  return (
    <div>
      <div className="sidebar-layout">
        <div className="app-sidebar">
          <Link to="/dashboard" className="sidebar-menu-item">
            Dashboard
          </Link>
          <Link
            to="/profile"
            className={`sidebar-menu-item ${!isSettings ? "active" : ""}`}
          >
            Profile Overview
          </Link>
          <Link
            to="/profile/abs"
            className={`sidebar-menu-item ${isSettings ? "active" : ""}`}
          >
            Account Settings
          </Link>
          <Link to="/appointments" className="sidebar-menu-item">
            My Appointments
          </Link>
          <Link to="/sessions" className="sidebar-menu-item">
            Session History
          </Link>
          <Link to="/settings" className="sidebar-menu-item">
            General Settings
          </Link>
        </div>

        <div className="main-content-area">
          <div className="background-blur"></div>

          <div className="content-header animate-fade-in">
            <h2 className="content-title">
              {isSettings ? "Advanced Settings" : "User Profile"}
            </h2>
          </div>

          <div className="animate-fade-in">
            {!isSettings ? (
              <div className="content-card translate-y-0 opacity-100 transition-all duration-500">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gradient-login-btn rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-white">
                      👤
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-navy">
                        Orion Developer
                      </h1>
                      <p className="text-gray-500 font-medium">
                        Full Stack Cloud Architect
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/profile/abs"
                    className="btn btn-primary shadow-md hover:shadow-xl transform hover:-translate-y-1"
                  >
                    EDIT PROFILE
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="item-card bg-ghostwhite border-none shadow-sm hover:shadow-md">
                    <h3 className="text-navy font-bold uppercase tracking-wider mb-4 border-b pb-2 border-gray-100">
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-semibold">
                          EMAIL
                        </span>
                        <span className="font-bold">dev@orion.app</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-semibold">
                          PHONE
                        </span>
                        <span className="font-bold">+1 (555) 000-1111</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-semibold">
                          LOCATION
                        </span>
                        <span className="font-bold">San Francisco, CA</span>
                      </div>
                    </div>
                  </div>

                  <div className="item-card bg-ghostwhite border-none shadow-sm hover:shadow-md">
                    <h3 className="text-navy font-bold uppercase tracking-wider mb-4 border-b pb-2 border-gray-100">
                      Account Status
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-semibold">
                          TIER
                        </span>
                        <span className="bg-bronze text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                          PREMIUM
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-semibold">
                          MEMBER SINCE
                        </span>
                        <span className="font-bold">Jan 2024</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-semibold">
                          STATUS
                        </span>
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          ● Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-navy mb-4">
                    Quick Actions
                  </h3>
                  <div className="flex gap-4">
                    <button className="btn btn-bronze flex-1 py-3 text-sm">
                      Download Report
                    </button>
                    <button className="btn btn-primary flex-1 py-3 text-sm">
                      Share Profile
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="content-card">
                <Outlet />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;
