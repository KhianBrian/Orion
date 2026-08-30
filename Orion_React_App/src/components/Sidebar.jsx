import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <aside className="h-full flex flex-col p-6">
      <div className="font-black mb-10 uppercase text-2xl border-b-4 border-black pb-2">
        Orion App
      </div>
      <nav className="flex flex-col space-y-4 flex-1">
        <Link
          to="/"
          className="border-2 border-black p-3 font-bold uppercase transition-colors hover:bg-black hover:text-white"
        >
          Home Page
        </Link>
        <Link
          to="/dashboard"
          className="border-2 border-black p-3 font-bold uppercase transition-colors hover:bg-black hover:text-white"
        >
          Dashboard
        </Link>
        <Link
          to="/profile"
          className="border-2 border-black p-3 font-bold uppercase transition-colors hover:bg-black hover:text-white"
        >
          Profile
        </Link>
      </nav>
      <div className="mt-8 border-t-2 border-black pt-4 text-xs font-bold uppercase">
        System Status: OK
      </div>
    </aside>
  );
};

export default Sidebar;
