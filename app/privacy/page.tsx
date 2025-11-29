import Logo from '../components/Logo'
import Link from 'next/link'
import ProtectedEmail from '../components/ProtectedEmail'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <Logo className="mb-4" size={120} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="card space-y-6 text-sm">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-700 mb-3">
              Donegal Mountain Rescue Team (&quot;DMRT&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates Patcher, a service that helps transform team member notes into social media posts. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
            <p className="text-gray-700">
              DMRT is a registered charity in Ireland. We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and the Data Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="font-medium text-gray-900 mb-2">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-3">
              We collect the following personal information:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li><strong>Email address:</strong> Used for authentication and communication</li>
              <li><strong>Notes and content:</strong> Text content you submit for post generation</li>
              <li><strong>Photos:</strong> Images you upload with your submissions</li>
              <li><strong>IP address:</strong> Collected automatically for security and rate limiting purposes</li>
            </ul>

            <h3 className="font-medium text-gray-900 mb-2 mt-4">2.2 Usage Data</h3>
            <p className="text-gray-700">
              We automatically collect information about how you interact with the service, including submission timestamps, post status, and workflow actions (approvals, edits, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">We use your personal information for the following purposes:</p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>To provide and maintain the Patcher service</li>
              <li>To authenticate your identity and manage access</li>
              <li>To generate social media posts using AI technology (Google Gemini)</li>
              <li>To facilitate the review and approval workflow</li>
              <li>To post content to Facebook and Instagram on your behalf</li>
              <li>To send you authentication links and notifications via email</li>
              <li>To ensure security and prevent abuse (rate limiting, bot detection)</li>
              <li>To maintain records for transparency and accountability</li>
            </ul>
            <p className="text-gray-700">
              We process your data based on your consent (when you submit content) and our legitimate interests in operating the service for the benefit of DMRT&apos;s charitable activities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="text-gray-700 mb-3">
              We use the following third-party services that may process your data:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li><strong>Google Gemini AI:</strong> Processes your notes to generate social media posts</li>
              <li><strong>Meta (Facebook/Instagram):</strong> Receives and publishes your approved posts</li>
              <li><strong>Resend:</strong> Sends authentication emails and notifications</li>
              <li><strong>Vercel:</strong> Hosts the application and stores photos (Vercel Blob)</li>
              <li><strong>Neon PostgreSQL:</strong> Stores your submission data and authentication codes</li>
              <li><strong>BotID (Kasada):</strong> Provides bot detection and security services</li>
            </ul>
            <p className="text-gray-700">
              All third-party services are bound by their own privacy policies and data processing agreements. We only share data necessary for the service to function.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p className="text-gray-700 mb-3">
              We retain your personal information for as long as necessary to provide the service and fulfill our charitable purposes:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li><strong>Submissions:</strong> Retained indefinitely for transparency and historical records</li>
              <li><strong>Authentication codes:</strong> Deleted immediately after use or after 4-hour expiration</li>
              <li><strong>Photos:</strong> Retained with submissions for historical purposes</li>
            </ul>
            <p className="text-gray-700">
              You may request deletion of your data at any time by contacting us (see Section 9).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Your Rights Under GDPR</h2>
            <p className="text-gray-700 mb-3">
              As a data subject in Ireland/EU, you have the following rights:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li><strong>Right of access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Right to restrict processing:</strong> Limit how we use your data</li>
              <li><strong>Right to data portability:</strong> Receive your data in a structured format</li>
              <li><strong>Right to object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-700">
              To exercise these rights, please contact us using the details in Section 9.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Data Security</h2>
            <p className="text-gray-700 mb-3">
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Encrypted authentication codes using cryptographically secure random generation</li>
              <li>Secure password hashing (bcrypt) for PRO access</li>
              <li>HTTPS encryption for all data transmission</li>
              <li>Rate limiting and bot detection to prevent abuse</li>
              <li>Role-based access control to limit data access</li>
              <li>Secure session management using JWT tokens</li>
            </ul>
            <p className="text-gray-700">
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p className="text-gray-700">
              Patcher is intended for use by DMRT team members, PRO, and team leaders only. We do not knowingly collect personal information from children under 16. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact Us</h2>
            <p className="text-gray-700 mb-3">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact:
            </p>
            <p className="text-gray-700 mb-3">
              <strong>Donegal Mountain Rescue Team</strong><br />
              Email: <ProtectedEmail className="text-blue-600" /><br />
              Website: <a href="https://donegalmrt.ie" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">donegalmrt.ie</a>
            </p>
            <p className="text-gray-700">
              You also have the right to lodge a complaint with the <strong>Data Protection Commission</strong> (Ireland) if you believe your data protection rights have been violated:
            </p>
            <p className="text-gray-700 mt-2">
              Data Protection Commission<br />
              Website: <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.dataprotection.ie</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 underline">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

