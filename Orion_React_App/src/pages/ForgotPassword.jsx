import { Link } from "react-router-dom";

const ForgotPassword = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Forgot Password?
        </h2>
        <p className="text-gray-600 mb-6">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
        <input
          type="email"
          placeholder="Email Address"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <button className="w-full bg-blue-600 text-white py-2 rounded-md font-bold hover:bg-blue-700 transition">
          Reset Password
        </button>
        <div className="mt-6">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
