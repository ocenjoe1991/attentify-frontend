import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../services/auth";
import { useUser } from "../../context/UserContext";
import { useCompany } from "../../context/CompanyContext"; 
import { jwtDecode } from "jwt-decode"
import { clearAuthStorage } from "../../utils/authStorage";

type JwtPayload = {
  sub: string;
  user_id: string;
  name: string,
  email: string,
  company_id: string,
  role: string,
  status: string,
  companies: any,
  redirect_url?: string,
};

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { setCompanies, setCurrentCompanyId } = useCompany();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  React.useEffect(() => {
    clearAuthStorage();
    setUser(null);
    setCompanies([]);
    setCurrentCompanyId("");
  }, [setUser, setCompanies, setCurrentCompanyId]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(loginEmail, loginPassword);
      const { token } = data;

      if (token) {
        localStorage.setItem("token", token);

        const decoded = jwtDecode<JwtPayload>(token);
        const user = {
          id: decoded.user_id,
          name: decoded.name,
          email: decoded.email,
          company_id: decoded?.company_id || "",
          role: decoded.role,
          status: decoded?.status || "",
          companies: decoded?.companies || []
        }

        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.companies?.length) {
          setCompanies(user.companies);
          setCurrentCompanyId(user.company_id); // default company from login
        }

        setMessage("Logged in! Redirecting...");

        let redirectPath = decoded.redirect_url || "/dashboard";
        if (!decoded.redirect_url && user.role === "admin") {
          redirectPath = "/admin/dashboard";
        }

        setTimeout(() => navigate(redirectPath), 1000); // redirect after short delay
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || ""}/auth/google/login`;
  };

  return (
    <div className="bg-white relative">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-3 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link to="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Attentify</span>
              <img className="h-12 w-auto" src="logo.png" alt="Attentify logo" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Login Form */}
      <div className="relative isolate pt-36 flex flex-1 items-center justify-center px-4 lg:pt-48">
        {/* Top Gradient Pattern */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white  shadow-lg w-full max-w-xl flex flex-col"
        >
          <div className="w-full px-6 py-8 flex flex-col justify-center">
            <h2 className="text-xl font-semibold mb-4 text-center">Log in</h2>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            {message && <div className="text-green-500 text-sm mb-2">{message}</div>}

            <label className="text-sm text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full border border-gray-300  px-3 py-2 mb-4 focus:outline-none focus:ring focus:ring-indigo-200"
              placeholder="you@example.com"
            />

            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-700 mb-1">Password</label>
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="text-sm text-gray-500 flex items-center gap-1"
              >
                {passwordVisible ? "Hide" : "Show"}
              </button>
            </div>

            <input
              type={passwordVisible ? "text" : "password"}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="w-full border border-gray-300  px-3 py-2 mb-1 focus:outline-none focus:ring focus:ring-indigo-200"
              placeholder="********"
            />

            <div className="mb-4 text-right">
              <Link
                to="/forget-password"
                className="text-sm text-indigo-600 underline hover:text-indigo-800"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 "
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            {/* Divider */}
            <div className="block h-px bg-gray-200 mx-6 my-6"></div>

            <button
              type="button"
              className="w-full border mt-4 border-gray-300  py-2 px-4 flex items-center justify-center gap-2 hover:bg-gray-50"
              onClick={handleGoogleLogin}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="h-5 w-5"
              />
              Continue with Google
            </button>
          </div>

          {/* Already have an account? */}
          <div className="text-center text-sm text-gray-600 mt-0">
            Don't have an account?{" "}
            <Link to="/signup" className="text-indigo-600 hover:underline font-medium">
              Sign up
            </Link>
          </div>

          <div className="border-t border-gray-200 mt-4 flex justify-center items-center px-4 py-2">
            <div className="text-sm text-gray-500">English (United States)</div>
          </div>
        </form>

        {/* Bottom Gradient Pattern */}
        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
