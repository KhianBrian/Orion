import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center p-4">
      <h1 className="text-9xl font-extrabold text-[#c2199b] tracking-widest">
        404
      </h1>
      <div className="bg-black text-white px-2 text-sm rounded rotate-12 absolute">
        Page Not Found
      </div>
      <button className="mt-5">
        <Link
          to="/"
          className="relative inline-block text-sm font-medium text-[#c2199b] group active:text-orange-500 focus:outline-none focus:ring"
        >
          <span className="absolute inset-0 transition-transform translate-x-0.5 translate-y-0.5 bg-[#c2199b] group-hover:translate-y-0 group-hover:translate-x-0"></span>

          <span className="relative block px-8 py-3 bg-[#1A2238] border border-current">
            Go Home
          </span>
        </Link>
      </button>
    </div>
  );
};

export default NotFound;
