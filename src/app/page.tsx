// app/page.tsx
"use client"; // Make it a Client Component to use hooks

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

// Define types for your API response
interface ApiData {
  [key: string]: any; // Replace with your actual API response structure
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
  if (session?.accessToken) {
    console.log("Access Token:", session.accessToken);
  }
}, [session?.accessToken]);
  // Handle token refresh errors
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      console.error("Token refresh failed, redirecting to sign in");
      signIn("oidc");
    }
  }, [session?.error]);

  const fetchApiData = async (): Promise<void> => {
    if (!session?.accessToken) {
      setApiData(null);
      setApiError("No access token available. Please log in.");
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await fetch("https://localhost:7077/api/data", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data: ApiData = await res.json();
        setApiData(data);
      } else {
        const errorData = await res.text();
        console.error("API Error Response:", errorData);
        
        // Handle specific HTTP status codes
        let errorMessage = `API Error: ${res.status} ${res.statusText}`;
        if (res.status === 401) {
          errorMessage += " - Access token may be expired or invalid";
        } else if (res.status === 403) {
          errorMessage += " - Insufficient permissions";
        }
        
        setApiError(`${errorMessage}. ${errorData.substring(0, 100)}`);
        setApiData(null);
      }
    } catch (error) {
      console.error("Fetch API Data Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setApiError(`Network Error: ${errorMessage}`);
      setApiData(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading session...</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome, {session.user?.name ?? "User"}!
          </h1>
          
          <div className="space-y-2 text-gray-700">
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>Provider ID:</strong> {session.user?.providerId || "Not available"}</p>
            <p><strong>Access Token (first 20 chars):</strong> {session.accessToken?.substring(0, 20)}...</p>
          </div>

          {session.error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
              <strong>Session Error:</strong> {session.error}
            </div>
          )}

          <button
            onClick={() => signOut()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">API Testing</h2>
          
          <button
            onClick={fetchApiData}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isLoading
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Loading..." : "Fetch Protected API Data"}
          </button>

          {apiData && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">API Response:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          )}

          {apiError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
              <strong>API Error:</strong> {apiError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Not signed in</h1>
        <button
          onClick={() => signIn("oidc")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Sign in with My IDP
        </button>
      </div>
    </div>
  );
}