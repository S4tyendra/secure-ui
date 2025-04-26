// I wasted these many days on code, if you too, add 1 to below number
// 2+1
// Hey, copilot! please add comments to the file where needed to make it easy for others to understand. (Hmm,, or.. even me after few weeks)

// This is a client component, meaning it runs in the user's browser

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "./../components/ui/button";
import { Input } from "./../components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// Define the main LoginPage component

export default function LoginPage() {
  // State variable to store the username entered by the user

  const [username, setUsername] = useState("");
  // State variable to store the password entered by the user

  const [password, setPassword] = useState("");
  // State variable to control the visibility of the password

  const [showPassword, setShowPassword] = useState(false);
  // State variable to indicate if the login process is in progress

  const [isLoading, setIsLoading] = useState(false);
  // State variable to store any error message to be displayed to the user

  const [errorMessage, seterrorMessage] = useState("");
  // Hook to navigate between different routes

  const navigate = useNavigate();
  // Hook to get the current location

  const location = useLocation();
  // State variable to manage the login type (select, admin, faculty, club, require_otp)

  const [loginType, setLoginType] = useState<
    "select" | "admin" | "faculty" | "club" | "require_otp" | "student"
  >("select");
  // State variable to store the OTP entered by the user

  const [otp, setOtp] = useState("");
  // Time in seconds to wait before resending OTP

  const otpResendWaitSeconds = 60; // Match server const: OTP_RESEND_WAIT_SECONDS
  // State variable to manage the timer for resending OTP

  const [timer, setTimer] = useState(otpResendWaitSeconds);
  // State variable to indicate if OTP can be resent

  const [canResend, setCanResend] = useState(false);

  // useEffect hook to check for OTP parameter in the URL

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("otp") === "true") {
      setLoginType("require_otp");
    }
  }, [location.search]);

  // useEffect hook to check user profile and potentially redirect to OTP verification

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/profile`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Profile data:", data);
          const role = data.role;
          if (data.role === "require_otp") {
            setLoginType("require_otp");
          }
          if (role === "admin") navigate("/admin");
          else if (role === "faculty") navigate("/faculty");
          else if (role === "cacs") navigate("/cacs");
          else if (role === "techknow") navigate("/techknow");
          else if (role === "sports") navigate("/sports");
          else if (role === "student") navigate("/student");
          else {
            console.warn(
              `Unexpected role after OTP verification: ${role}. Redirecting to default.`
            );
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, []);

  // useEffect hook to manage the OTP resend timer

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (loginType === "require_otp" && timer > 0 && !canResend) {
      intervalId = setInterval(() => {
        setTimer((prevTimer) => {
          const nextTimer = prevTimer - 1;
          if (nextTimer <= 0) {
            if (intervalId) clearInterval(intervalId);
            setCanResend(true);
            return 0;
          }
          return nextTimer;
        });
      }, 1000);
    } else if (timer <= 0 && loginType === "require_otp" && !canResend) {
      setCanResend(true);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loginType, timer, canResend]);

  // Function to handle resending OTP

  const handleResendOtp = async () => {
    setIsLoading(true);
    seterrorMessage("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/resend-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || "OTP has been resent.");
        setCanResend(false);
        setTimer(otpResendWaitSeconds);
      } else {
        if (response.status === 401) {
          setLoginType("select");
          toast.error(
            data.message || "Session invalid or expired. Please log in again."
          );
        } else if (response.status === 429) {
          toast.warning(data.message || "Too many requests.");
          const waitMatch = data.message?.match(/(\d+)\s*seconds/);
          const waitTime = waitMatch
            ? parseInt(waitMatch[1], 10)
            : otpResendWaitSeconds;
          setTimer(waitTime);
          setCanResend(false);
        } else {
          toast.error(
            data.message || `Resend OTP failed with status: ${response.status}`
          );
          setCanResend(true);
        }
      }
    } catch (error) {
      console.error("Resend OTP network/client error:", error);
      seterrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected network error occurred."
      );
      setCanResend(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle OTP verification

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      seterrorMessage("Please enter a 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    seterrorMessage("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/verify-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          data.message || "OTP verified successfully! Redirecting..."
        );

        setTimeout(async () => {
          try {
            const profileResponse = await fetch(
              `${import.meta.env.VITE_SERVER_URL}/profile`,
              {
                method: "GET",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
              }
            );

            if (!profileResponse.ok) {
              throw new Error(
                `Failed to fetch profile (status: ${profileResponse.status})`
              );
            }

            const profileData = await profileResponse.json();
            const role = profileData.role;

            if (role === "require_otp") {
              console.error(
                "OTP Verification succeeded server-side, but profile still shows require_otp."
              );
              toast.error(
                "Verification seems successful, but role update pending. Please refresh or try logging in again."
              );
              setLoginType("select");
              return;
            }

            // Get the 'next' parameter from the URL, if any

            const urlParams = new URLSearchParams(location.search);
            const next = urlParams.get("next");

            if (role === "admin") navigate(next ?? "/admin");
            else if (role === "faculty") navigate(next ?? "/faculty");
            else if (role === "cacs") navigate(next ?? "/cacs");
            else if (role === "techknow") navigate(next ?? "/techknow");
            else if (role === "sports") navigate(next ?? "/sports");
            else if (role === "student") navigate(next ?? "/student");
            else {
              console.warn(
                `Unexpected role after OTP verification: ${role}. Redirecting to default.`
              );
              navigate("/");
            }
          } catch (profileError) {
            console.error(
              "Verify OTP: Profile fetch failed after successful OTP verification:",
              profileError
            );
            toast.error(
              "OTP verified, but failed to confirm your role. Please try logging in again."
            );
            setLoginType("select");
          } finally {
            setIsLoading(false);
          }
        }, 1000);
      } else {
        if (response.status === 401 || response.status === 400) {
          // Invalid OTP, Invalid/Expired Session, Bad Request
          seterrorMessage(data.message || "Invalid OTP or session expired.");
          setOtp("");
        } else if (response.status === 429) {
          seterrorMessage(data.message || "Too many verification attempts.");
          if (
            data.message?.includes(
              "Maximum OTP verification attempts reached for this session"
            )
          ) {
            setLoginType("select");
            toast.error(
              "Max attempts for this session reached. Please log in again."
            );
          }
          setOtp("");
        } else {
          seterrorMessage(
            data.message ||
              `OTP verification failed unexpectedly (Status: ${response.status})`
          );
          setOtp("");
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Verify OTP network/client error:", error);
      seterrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected network error occurred."
      );
      setIsLoading(false);
      setOtp("");
    }
  };

  // Function to handle form submission for admin login

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    seterrorMessage("");
    let response: Response | undefined = undefined;

    try {
      response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Login failed with status: ${response.status}`
        );
      }

      if (data.message?.includes("please verify OTP")) {
        setLoginType("require_otp");
        setOtp("");
        seterrorMessage("");
        setTimer(otpResendWaitSeconds);
        setCanResend(false);
        toast.info(data.message);
      } else {
        console.warn(
          "Login successful but OTP requirement message missing:",
          data
        );
        seterrorMessage(
          "Login succeeded but encountered an unexpected server response. Please try again."
        );
      }
    } catch (error) {
      console.error("Login error caught:", error);
      let message = "An unknown error occurred during login.";

      if (error instanceof Error) {
        message = error.message;
      }

      if (response?.status === 429) {
        toast.warning(message);
      } else {
        seterrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle Google Sign-In

  function handleGoogleSignIn() {
    const callbackUrl = encodeURIComponent(window.location.hostname);
    window.location.href = `${
      import.meta.env.VITE_SERVER_URL
    }/auth/google?callback=${callbackUrl}`;
  }

  // Function to render the login type selector

  const renderLoginSelector = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-[#020817] dark:text-white">
        Welcome, IIIT!
      </h2>
      <div className="space-y-4">
        <Button
          onClick={() => setLoginType("student")}
          className="w-full rounded-2xl h-12 border font-semibold"
        >
          Student Login
        </Button>

        <Button
          onClick={() => setLoginType("faculty")}
          className="w-full rounded-2xl h-12 border font-semibold"
        >
          Faculty/Dean Login
        </Button>

        <Button
          onClick={() => setLoginType("club")}
          className="w-full rounded-2xl h-12 border font-semibold"
        >
          Society Login
        </Button>
        <Button
          onClick={() => setLoginType("admin")}
          className="w-full rounded-2xl h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 font-semibold"
        >
          Administrator Login
        </Button>
      </div>
    </div>
  );

  // Function to render the admin login form

  const renderAdminLogin = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant="ghost"
          onClick={() => setLoginType("select")}
          className="mr-4 h-auto text-[#020817] dark:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold text-center flex-1 text-[#020817] dark:text-white">
          Administrator Login
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium  mb-1 text-[#020817] dark:text-white"
          >
            Email
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-2xl text-[#020817] dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium  mb-1 text-[#020817] dark:text-white"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl pr-10 text-[#020817] dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.2 }}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 " />
                ) : (
                  <Eye className="h-5 w-5 " />
                )}
              </motion.div>
            </button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 font-semibold"
        >
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="h-5 w-5 animate-spin" />
            </motion.div>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  );

  // Function to render the faculty login option

  const renderFacultyLogin = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant="ghost"
          onClick={() => setLoginType("select")}
          className="text-[#020817] dark:text-white mr-4 h-auto"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold text-center flex-1 text-[#020817] dark:text-white">
          Faculty/Dean Login
        </h2>
      </div>
      <div className="text-center space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/30">
          <p className="text-sm text-[#020817] dark:text-white">
            Please use your institutional email address (dean. adress for dean
            login)
          </p>
          <p className="text-sm font-semibold text-[#020817] dark:text-white">
            (@iiitkota.ac.in)
          </p>
        </div>
        <Button
          onClick={handleGoogleSignIn}
          className="w-full rounded-2xl h-12 border font-semibold "
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );

  const renderStudentLogin = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant="ghost"
          onClick={() => setLoginType("select")}
          className="text-[#020817] dark:text-white mr-4 h-auto"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold text-center flex-1 text-[#020817] dark:text-white">
          Student Login
        </h2>
      </div>
      <div className="text-center space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/30">
          <p className="text-sm text-[#020817] dark:text-white">
            Please use your institutional email address
          </p>
          <p className="text-sm font-semibold text-[#020817] dark:text-white">
            (@iiitkota.ac.in)
          </p>
        </div>
        <Button
          onClick={handleGoogleSignIn}
          className="w-full rounded-2xl h-12 border font-semibold "
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );

  // Function to render the society login option

  const renderSocietyLogin = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6 ">
        <Button
          variant="ghost"
          onClick={() => setLoginType("select")}
          className="mr-4 h-auto text-[#020817] dark:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold text-center flex-1 text-[#020817] dark:text-white">
          Society Login
        </h2>
      </div>
      <div className="text-center space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/30">
          <p className="text-sm text-[#020817] dark:text-white">
            Please use your institutional email address
          </p>
          <p className="text-sm font-semibold text-[#020817] dark:text-white">
            (@iiitkota.ac.in)
          </p>
        </div>
        <Button
          onClick={handleGoogleSignIn}
          className="w-full rounded-2xl h-12 border font-semibold"
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );

  // Function to render the OTP verification form

  const renderOtpVerification = () => (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => setLoginType("admin")}
        className="mr-4 h-auto text-[#020817] dark:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-3xl font-bold text-center mb-6">Verify OTP</h2>
      <div className="text-center space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/30">
          <p className="text-sm text-[#020817] dark:text-white">
            Please enter the 6-digit OTP sent to your registered email address.
          </p>
        </div>

        <div className="space-y-4 flex flex-col items-center">
          <InputOTP
            value={otp}
            onChange={(value) => setOtp(value)}
            maxLength={6}
            className="gap-2"
            autoFocus
          >
            <InputOTPGroup className="text-green-500">
              <InputOTPSlot
                index={0}
                className="rounded-l-md border-gray-400"
              />
              <InputOTPSlot index={1} className=" border-gray-400" />
              <InputOTPSlot index={2} className=" border-gray-400" />
              <InputOTPSlot index={3} className=" border-gray-400" />
              <InputOTPSlot index={4} className=" border-gray-400" />
              <InputOTPSlot
                index={5}
                className="rounded-r-md border-gray-400"
              />
            </InputOTPGroup>
          </InputOTP>

          <div className="text-sm text-center">
            {timer > 0 ? (
              <p>Resend OTP in {timer} seconds</p>
            ) : (
              <Button
                variant="link"
                onClick={handleResendOtp}
                disabled={isLoading || !canResend}
                className="text-blue-500 h-auto p-0 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {isLoading && !canResend ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Resend OTP
              </Button>
            )}
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={isLoading || otp.length !== 6}
            className="w-full rounded-2xl h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 font-semibold"
          >
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-5 w-5 animate-spin" />
              </motion.div>
            ) : (
              "Verify OTP"
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Main return statement for the LoginPage component

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br relative overflow-hidden">
      <motion.div className="absolute inset-0 z-0" />
      <Toaster position="bottom-right" closeButton richColors />
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-[26px] shadow-lg p-8 bg-gradient-to-br from-blue-500/10 to-indigo-500/20 backdrop-blur-lg text-white">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-6"
              >
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={loginType}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {loginType === "select" && renderLoginSelector()}
                {loginType === "admin" && renderAdminLogin()}
                {loginType === "faculty" && renderFacultyLogin()}
                {loginType === "club" && renderSocietyLogin()}
                {loginType === "student" && renderStudentLogin()}
                {loginType === "require_otp" && renderOtpVerification()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        <div className="text-center mt-6 text-sm ">
          Trouble logging in? Drop a mail to{" "}
          <a
            href="mailto:webmaster@iiitkota.ac.in"
            className="text-blue-500 hover:underline"
          >
            webmaster@iiitkota.ac.in
          </a>
          , we will try to solve your issue.
        </div>
      </div>
    </div>
  );
}
