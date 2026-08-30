import { Link } from "react-router-dom";

const Dashboard = () => {
  const dashboardActions = [
    {
      title: "Appointments",
      description: "View and manage your scheduled appointments",
      path: "/appointments",
      icon: "📅",
    },
    {
      title: "Doctor Availability",
      description: "Browse available doctors and book sessions",
      path: "/doctor-availability",
      icon: "👨‍⚕️",
    },
    {
      title: "Patient Appointment",
      description: "Schedule appointments for patients",
      path: "/patient-appointment",
      icon: "📋",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold uppercase">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardActions.map((action, index) => (
          <Link
            key={index}
            to={action.path}
            className="border-2 border-black p-6 hover:bg-black hover:text-white transition-all group no-underline text-black"
          >
            <div className="text-4xl mb-4">{action.icon}</div>
            <h2 className="text-xl font-bold uppercase mb-2">{action.title}</h2>
            <p className="text-sm opacity-80 group-hover:opacity-100">
              {action.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-2 border-black p-8 text-center">
            <div className="font-bold underline mb-2">Stat {i}</div>
            <div className="text-2xl font-black">100.00</div>
          </div>
        ))}
      </div>

      <div className="border-2 border-black p-8">
        <div className="font-bold mb-4">Chart Placeholder</div>
        <div className="h-32 border border-dashed border-black flex items-center justify-center">
          [ GRAPH OUTLINE ]
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
