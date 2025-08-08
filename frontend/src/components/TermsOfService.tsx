import React from "react";
import { Link } from "react-router-dom";

const TermsOfService: React.FC = () => {
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
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-gray-400 text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using Git Story, you accept and agree to be
                bound by the terms and provision of this agreement. If you do
                not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                2. Description of Service
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Git Story is a platform that transforms your GitHub repositories
                into descriptive, AI-generated stories. We use your repository
                data to create narrative content that showcases your development
                journey and projects.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                3. User Rights and Responsibilities
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">You have the right to:</strong>
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>
                    Access and use Git Story for personal and professional
                    purposes
                  </li>
                  <li>Generate stories from your own repositories</li>
                  <li>Modify, delete, or export your generated content</li>
                  <li>Disconnect your GitHub account at any time</li>
                  <li>Request deletion of your account and associated data</li>
                </ul>

                <p className="text-gray-300 leading-relaxed mt-6">
                  <strong className="text-white">You agree to:</strong>
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>
                    Only use repositories you own or have permission to access
                  </li>
                  <li>
                    Not use the service for any illegal or harmful purposes
                  </li>
                  <li>Respect the intellectual property rights of others</li>
                  <li>
                    Not attempt to reverse engineer or compromise the service
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                4. Data and Privacy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We respect your privacy and are committed to protecting your
                data. We only access the repositories you explicitly authorize
                and use this data solely to generate your stories. We do not
                sell, rent, or share your personal data with third parties. For
                more details, see our{" "}
                <Link
                  to="/privacy"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                5. Intellectual Property
              </h2>
              <p className="text-gray-300 leading-relaxed">
                You retain full ownership of your repository content and code.
                The stories generated by Git Story are created for your use, and
                you have the right to use, modify, or distribute them as you see
                fit. We do not claim ownership of your generated content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                6. Service Availability
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We strive to provide reliable service but cannot guarantee 100%
                uptime. We may occasionally need to perform maintenance or
                updates.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Git Story is provided "as is" without warranties of any kind. We
                are not liable for any damages arising from your use of the
                service, including but not limited to data loss, service
                interruption, or any indirect or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                8. Termination
              </h2>
              <p className="text-gray-300 leading-relaxed">
                You may terminate your account at any time by contacting us at{" "}
                <a
                  href="mailto:hello@gitstory.dev"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  hello@gitstory.dev
                </a>
                . We may terminate accounts that violate these terms. Upon
                termination, we will delete your data within 30 days, except
                where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                9. Changes to Terms
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We may update these terms from time to time. Continued use of
                Git Story after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                10. Contact Information
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these terms, please contact us
                at{" "}
                <a
                  href="mailto:hello@gitstory.dev"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  hello@gitstory.dev
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
