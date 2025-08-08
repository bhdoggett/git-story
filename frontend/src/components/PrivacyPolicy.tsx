import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy: React.FC = () => {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-400 text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                1. Introduction
              </h2>
              <p className="text-gray-300 leading-relaxed">
                At Git Story, we believe your privacy is fundamental. This
                Privacy Policy explains how we collect, use, and protect your
                information when you use our service. We are committed to
                transparency and giving you control over your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                2. Information We Collect
              </h2>
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-white mb-3">
                  2.1 Information You Provide
                </h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>
                    <strong className="text-white">GitHub Profile Data:</strong>{" "}
                    When you authenticate with GitHub, we receive your public
                    profile information including name, username, avatar, and
                    email (if public)
                  </li>
                  <li>
                    <strong className="text-white">GitHub Access Token:</strong>{" "}
                    We temporarily store your GitHub access token in server-side
                    sessions to authenticate API requests. This token is not
                    stored in our database and is automatically cleared when you
                    log out or your session expires.
                  </li>
                  <li>
                    <strong className="text-white">Repository Access:</strong>{" "}
                    We only access repositories you explicitly authorize through
                    GitHub OAuth
                  </li>
                  <li>
                    <strong className="text-white">Generated Content:</strong>{" "}
                    Stories and content you create using our service
                  </li>
                </ul>

                <h3 className="text-xl font-medium text-white mb-3 mt-6">
                  2.2 Information We Collect Automatically
                </h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>
                    <strong className="text-white">Usage Data:</strong> How you
                    interact with our service (pages visited, features used)
                  </li>
                  <li>
                    <strong className="text-white">Technical Data:</strong>{" "}
                    Browser type, device information, IP address (for security
                    and analytics)
                  </li>
                  <li>
                    <strong className="text-white">Cookies:</strong> Essential
                    cookies for authentication and session management
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use your information solely to provide and improve Git Story:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Generate AI-powered stories from your repositories</li>
                <li>Provide personalized features and recommendations</li>
                <li>Maintain and improve our service</li>
                <li>Ensure security and prevent abuse</li>
                <li>Communicate with you about service updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                4. Data Sharing and Third Parties
              </h2>
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-white">
                  We do not sell, rent, or trade your personal data.
                </strong>{" "}
                We may share your information only in these limited
                circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
                <li>
                  <strong className="text-white">Service Providers:</strong>{" "}
                  Trusted third parties who help us operate our service
                  (hosting, analytics)
                </li>
                <li>
                  <strong className="text-white">Legal Requirements:</strong>{" "}
                  When required by law or to protect our rights and safety
                </li>
                <li>
                  <strong className="text-white">With Your Consent:</strong>{" "}
                  Only when you explicitly agree
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                5. Data Security
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We implement industry-standard security measures to protect your
                data:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
                <li>HTTPS encryption for data in transit</li>
                <li>Secure authentication through GitHub OAuth</li>
                <li>Secure session management with httpOnly cookies</li>
                <li>Secure hosting infrastructure</li>
                <li>No storage of sensitive data in our database</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                6. Your Rights and Choices
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong className="text-white">You have the right to:</strong>
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>
                    <strong className="text-white">Access:</strong> Request a
                    copy of your personal data
                  </li>
                  <li>
                    <strong className="text-white">Correction:</strong> Update
                    or correct inaccurate information
                  </li>
                  <li>
                    <strong className="text-white">Deletion:</strong> Request
                    deletion of your account and data
                  </li>
                  <li>
                    <strong className="text-white">Portability:</strong> Export
                    your data in a machine-readable format
                  </li>
                  <li>
                    <strong className="text-white">Objection:</strong> Object to
                    certain processing of your data
                  </li>
                  <li>
                    <strong className="text-white">Withdrawal:</strong> Revoke
                    GitHub access at any time
                  </li>
                </ul>

                <p className="text-gray-300 leading-relaxed mt-6">
                  To exercise these rights, contact us at{" "}
                  <a
                    href="mailto:hello@gitstory.dev"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    hello@gitstory.dev
                  </a>
                  .
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                7. Data Retention
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your data only as long as necessary to provide our
                service:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
                <li>
                  <strong className="text-white">Active Accounts:</strong> Data
                  is retained while your account is active
                </li>
                <li>
                  <strong className="text-white">Deactivated Accounts:</strong>{" "}
                  Data is deleted within 30 days of account deletion
                </li>
                <li>
                  <strong className="text-white">Legal Requirements:</strong>{" "}
                  Some data may be retained longer if required by law
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                8. Children's Privacy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Git Story is not intended for children under 13. We do not
                knowingly collect personal information from children under 13.
                If you believe we have collected such information, please
                contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                9. International Data Transfers
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Your data may be processed in countries other than your own. We
                ensure appropriate safeguards are in place to protect your data
                in accordance with this Privacy Policy and applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                10. Changes to This Policy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. Your
                continued use of Git Story after changes constitutes acceptance
                of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                11. Contact Us
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about this Privacy Policy or our data
                practices, please contact us:
              </p>
              <div className="mt-4 space-y-2 text-gray-300">
                <p>
                  Email:{" "}
                  <a
                    href="mailto:hello@gitstory.dev"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    hello@gitstory.dev
                  </a>
                </p>
              </div>
            </section>

            <section className="mt-12 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Your Privacy Matters
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We're committed to building a service that respects your privacy
                and gives you control over your data. If you have any concerns
                or suggestions about our privacy practices, we'd love to hear
                from you.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
