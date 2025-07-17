import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
      <h1
        className="text-xl font-semibold cursor-pointer"
        onClick={() => navigate("/dashboard")}
      >
        K-Meet
      </h1>

      <div className="flex items-center gap-4">
        <span className="text-sm hidden md:inline">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
