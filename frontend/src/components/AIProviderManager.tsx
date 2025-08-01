import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";

interface AIProvider {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AIProviderManager: React.FC = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(
    null
  );
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    provider: "openai",
    name: "",
    apiKey: "",
  });

  const providerOptions = [
    { value: "openai", label: "OpenAI (GPT-4, GPT-3.5)" },
    { value: "google", label: "Google Gemini" },
    { value: "claude", label: "Claude (Anthropic)" },
    { value: "perplexity", label: "Perplexity" },
  ];

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.aiProviders.getAll();
      setProviders(response.data);
    } catch (err) {
      setError("Failed to load AI providers");
      console.error("Error fetching providers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        await apiClient.aiProviders.update(editingProvider.id, formData);
      } else {
        await apiClient.aiProviders.add(formData);
      }

      setFormData({ provider: "openai", name: "", apiKey: "" });
      setShowAddForm(false);
      setEditingProvider(null);
      fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider");
    }
  };

  const handleEdit = (provider: AIProvider) => {
    setEditingProvider(provider);
    setFormData({
      provider: provider.provider,
      name: provider.name,
      apiKey: "", // Don't populate API key for security
    });
    setShowAddForm(true);
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm("Are you sure you want to delete this AI provider?")) return;

    try {
      await apiClient.aiProviders.delete(providerId);
      fetchProviders();
    } catch (err) {
      setError("Failed to delete provider");
    }
  };

  const handleTest = async (providerId: string) => {
    try {
      setTestingProvider(providerId);
      const response = await apiClient.aiProviders.test(providerId);
      alert(`Test successful! ${response.data.message}`);
    } catch (err) {
      alert(
        `Test failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleActive = async (
    providerId: string,
    currentActive: boolean
  ) => {
    try {
      await apiClient.aiProviders.update(providerId, {
        isActive: !currentActive,
      });
      fetchProviders(); // Refresh the list
    } catch (err) {
      setError("Failed to toggle provider status");
      console.error("Error toggling provider:", err);
    }
  };

  const handleCancel = () => {
    setFormData({ provider: "openai", name: "", apiKey: "" });
    setShowAddForm(false);
    setEditingProvider(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Providers</h2>
          <p className="text-gray-400 mt-1">
            Manage your AI provider API keys for story generation
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Provider
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingProvider ? "Edit AI Provider" : "Add AI Provider"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!editingProvider}
              >
                {providerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="My OpenAI Key"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                placeholder={
                  editingProvider ? "Leave blank to keep current key" : "sk-..."
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!editingProvider}
              />
              <p className="text-xs text-gray-400 mt-1">
                Your API key is encrypted and stored securely
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                {editingProvider ? "Update" : "Add"} Provider
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Providers List */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300">
              No AI providers configured
            </h3>
            <p className="text-gray-400 mt-1">
              Add an AI provider to start generating intelligent stories from
              your commits
            </p>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-white">
                      {provider.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {provider.provider.toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        provider.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {provider.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    Added {new Date(provider.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      handleToggleActive(provider.id, provider.isActive)
                    }
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      provider.isActive
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {provider.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={testingProvider === provider.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    {testingProvider === provider.id ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={() => handleEdit(provider)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AIProviderManager;
