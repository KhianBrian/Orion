const Header = () => {
  return (
    <header className="h-16 flex items-center justify-between px-6">
      <div className="font-bold uppercase tracking-tight">Header Area</div>
      <div className="flex space-x-6">
        <span className="border border-black px-3 py-1 text-sm font-bold uppercase">
          Search
        </span>
        <span className="border border-black px-3 py-1 text-sm font-bold uppercase">
          User Profile
        </span>
      </div>
    </header>
  );
};

export default Header;
