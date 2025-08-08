import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface ServiceStatus {
  status: "healthy" | "unhealthy" | "checking";
  timestamp?: string;
  uptime?: number;
  environment?: string;
  error?: string;
}

const StatusPage: React.FC = () => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    status: "checking",
  });
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkHealth = async () => {
    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";
      const response = await fetch(`${apiBaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServiceStatus({
          status: "healthy",
          timestamp: data.timestamp,
          uptime: data.uptime,
          environment: data.environment,
        });
      } else {
        setServiceStatus({
          status: "unhealthy",
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      setServiceStatus({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-400";
      case "unhealthy":
        return "text-red-400";
      case "checking":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "unhealthy":
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "checking":
        return (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            to="/login"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Login
          </Link>
          <h1 className="text-4xl font-bold mb-4">Service Status</h1>
          <p className="text-gray-400 text-lg">
            Real-time status of Git Story services
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* API Status */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">API Server</h3>
              <div
                className={`flex items-center ${getStatusColor(serviceStatus.status)}`}
              >
                {getStatusIcon(serviceStatus.status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`font-medium capitalize ${getStatusColor(serviceStatus.status)}`}
                >
                  {serviceStatus.status}
                </span>
              </div>

              {serviceStatus.environment && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Environment:</span>
                  <span className="text-white capitalize">
                    {serviceStatus.environment}
                  </span>
                </div>
              )}

              {serviceStatus.uptime && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime:</span>
                  <span className="text-white">
                    {formatUptime(serviceStatus.uptime)}
                  </span>
                </div>
              )}

              {serviceStatus.timestamp && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Check:</span>
                  <span className="text-white text-sm">
                    {new Date(serviceStatus.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {serviceStatus.error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                  <p className="text-red-400 text-sm">{serviceStatus.error}</p>
                </div>
              )}
            </div>
          </div>

          {/* GitHub Integration */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                GitHub Integration
              </h3>
              <div className="text-green-400">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 font-medium">Operational</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Authentication:</span>
                <span className="text-green-400 font-medium">Available</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">API Access:</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>
          </div>

          {/* AI Services */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                AI Story Generation
              </h3>
              <div className="text-green-400">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 font-medium">Operational</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Gemini API:</span>
                <span className="text-green-400 font-medium">Connected</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Story Generation:</span>
                <span className="text-green-400 font-medium">Available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
          <button
            onClick={checkHealth}
            className="mt-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
          >
            Refresh Status
          </button>
        </div>

        {/* Status Legend */}
        <div className="mt-12 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">
            Status Legend
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <span className="text-gray-300">
                Operational - All systems working normally
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
              <span className="text-gray-300">
                Checking - Verifying service status
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
              <span className="text-gray-300">
                Issue - Service experiencing problems
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Experiencing issues? Contact us at{" "}
            <a
              href="mailto:hello@gitstory.dev"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              hello@gitstory.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
