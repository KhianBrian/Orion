import { useState } from "react";

const ProfileSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    publicProfile: true,
    twoFactorAuth: false,
    theme: "light",
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 gap-6">
        {/* Category: Notifications */}
        <div className="item-card border-none bg-white p-6 shadow-sm">
          <h3 className="text-navy font-bold text-lg mb-6 flex items-center gap-2">
            <span>🔔</span> Notification Preferences
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center group">
              <div>
                <div className="font-bold text-gray-800">
                  Email Notifications
                </div>
                <div className="text-sm text-gray-500">
                  Receive weekly digests and account updates
                </div>
              </div>
              <button
                onClick={() => handleToggle("emailNotifications")}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.emailNotifications ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.emailNotifications
                      ? "translate-x-7"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-between items-center group">
              <div>
                <div className="font-bold text-gray-800">SMS Alerts</div>
                <div className="text-sm text-gray-500">
                  Get critical security alerts via text message
                </div>
              </div>
              <button
                onClick={() => handleToggle("smsNotifications")}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.smsNotifications ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.smsNotifications
                      ? "translate-x-7"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Category: Security & Privacy */}
        <div className="item-card border-none bg-white p-6 shadow-sm">
          <h3 className="text-navy font-bold text-lg mb-6 flex items-center gap-2">
            <span>🔒</span> Security & Privacy
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">Public Profile</div>
                <div className="text-sm text-gray-500">
                  Allow other users to see your achievements
                </div>
              </div>
              <button
                onClick={() => handleToggle("publicProfile")}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.publicProfile ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.publicProfile ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">
                  Two-Factor Authentication
                </div>
                <div className="text-sm text-red-500 font-medium italic">
                  Recommended for security
                </div>
              </div>
              <button
                onClick={() => handleToggle("twoFactorAuth")}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.twoFactorAuth ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.twoFactorAuth ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Section */}
        <div className="flex justify-end pt-4">
          <button className="btn btn-primary px-10 py-3 shadow-lg hover:shadow-2xl transition-all">
            SAVE ALL CHANGES
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
