import Logo from '../components/Logo'
import Link from 'next/link'
import ProtectedEmail from '../components/ProtectedEmail'

export default function TermsPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <Logo className="mb-4" size={120} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="card space-y-6 text-sm">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-3">
              By accessing and using Patcher (&quot;the Service&quot;), operated by Donegal Mountain Rescue Team (&quot;DMRT&quot;, &quot;we&quot;, &quot;us&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the Service.
            </p>
            <p className="text-gray-700">
              DMRT is a registered charity in Ireland. The Service is provided to support DMRT&apos;s charitable activities and is intended for use by authorized team members, PRO, and team leaders only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Eligibility and Access</h2>
            <p className="text-gray-700 mb-3">
              The Service is restricted to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Authorized DMRT team members (as defined by approved email addresses)</li>
              <li>DMRT PRO (Public Relations Officer)</li>
              <li>DMRT team leaders</li>
            </ul>
            <p className="text-gray-700">
              Access is granted through email-based authentication. You must use an email address that has been pre-approved by DMRT. Unauthorized access attempts are prohibited and may result in legal action.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Use of the Service</h2>
            <h3 className="font-medium text-gray-900 mb-2">3.1 Permitted Use</h3>
            <p className="text-gray-700 mb-3">
              You may use the Service to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Submit notes about DMRT incidents, training, or activities</li>
              <li>Generate social media posts for DMRT&apos;s official accounts</li>
              <li>Review, edit, and approve posts in accordance with your role</li>
              <li>Post approved content to DMRT&apos;s Facebook and Instagram accounts</li>
            </ul>

            <h3 className="font-medium text-gray-900 mb-2 mt-4">3.2 Prohibited Activities</h3>
            <p className="text-gray-700 mb-3">You must not:</p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Use the Service for any purpose other than DMRT&apos;s charitable activities</li>
              <li>Submit false, misleading, or defamatory content</li>
              <li>Submit content that violates any laws or infringes on third-party rights</li>
              <li>Attempt to bypass security measures or access unauthorized areas</li>
              <li>Use automated systems (bots) to interact with the Service</li>
              <li>Share authentication credentials with unauthorized persons</li>
              <li>Upload malicious files or attempt to compromise the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Content and Intellectual Property</h2>
            <h3 className="font-medium text-gray-900 mb-2">4.1 Your Content</h3>
            <p className="text-gray-700 mb-3">
              By submitting content (notes, photos, feedback) to the Service, you grant DMRT a non-exclusive, royalty-free, perpetual license to use, modify, and publish that content for DMRT&apos;s charitable purposes, including posting to social media platforms.
            </p>
            <p className="text-gray-700 mb-3">
              You represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>You own or have the right to use all content you submit</li>
              <li>Your content does not violate any laws or third-party rights</li>
              <li>Your content is accurate and truthful</li>
              <li>You have obtained necessary permissions for any photos featuring identifiable individuals</li>
            </ul>

            <h3 className="font-medium text-gray-900 mb-2 mt-4">4.2 AI-Generated Content</h3>
            <p className="text-gray-700">
              Posts generated by AI (Google Gemini) are suggestions only. You are responsible for reviewing and approving all content before it is posted. DMRT is not liable for errors or inaccuracies in AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Approval Workflow</h2>
            <p className="text-gray-700 mb-3">
              The Service includes an approval workflow:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li><strong>Team Members:</strong> Submit notes and review AI-generated posts</li>
              <li><strong>PRO:</strong> Reviews submissions, may edit posts, and can post directly or request team leader approval</li>
              <li><strong>Team Leaders:</strong> Approve or reject posts that require additional review</li>
            </ul>
            <p className="text-gray-700">
              All parties must act in good faith and in the best interests of DMRT. Decisions regarding content approval are final.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Social Media Posting</h2>
            <p className="text-gray-700 mb-3">
              When you approve a post for publication:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>The post will be published to DMRT&apos;s official Facebook and Instagram accounts</li>
              <li>You acknowledge that posts become public and may be shared, commented on, or archived by social media platforms</li>
              <li>DMRT is not responsible for third-party interactions with posted content</li>
              <li>Posts cannot be edited or deleted through this Service once published (you must use the social media platform directly)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Account Security</h2>
            <p className="text-gray-700 mb-3">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Maintaining the confidentiality of your authentication credentials</li>
              <li>Notifying DMRT immediately if you suspect unauthorized access</li>
              <li>Using secure email accounts and protecting access to your email</li>
              <li>Logging out when finished using the Service</li>
            </ul>
            <p className="text-gray-700">
              DMRT reserves the right to suspend or terminate access if security is compromised or terms are violated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Service Availability</h2>
            <p className="text-gray-700 mb-3">
              DMRT strives to maintain Service availability but does not guarantee:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Uninterrupted or error-free operation</li>
              <li>Immediate response times</li>
              <li>Compatibility with all devices or browsers</li>
            </ul>
            <p className="text-gray-700">
              The Service may be temporarily unavailable due to maintenance, updates, or unforeseen circumstances. DMRT is not liable for any loss resulting from Service unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p className="text-gray-700 mb-3">
              As a charity, DMRT&apos;s liability is limited to the maximum extent permitted by Irish law:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>DMRT is not liable for indirect, consequential, or incidental damages</li>
              <li>DMRT is not responsible for third-party services (Google, Meta, etc.) or their actions</li>
              <li>DMRT is not liable for content posted by users that violates laws or third-party rights</li>
              <li>Total liability is limited to €100 or the amount paid for the Service (whichever is greater)</li>
            </ul>
            <p className="text-gray-700">
              Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or other matters that cannot be excluded under Irish law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless DMRT, its volunteers, officers, and agents from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, violation of these terms, or infringement of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p className="text-gray-700 mb-3">
              DMRT may terminate or suspend your access to the Service at any time, with or without cause or notice, including for:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 ml-4">
              <li>Violation of these Terms of Service</li>
              <li>Unauthorized access attempts</li>
              <li>Misuse of the Service</li>
              <li>End of your association with DMRT</li>
            </ul>
            <p className="text-gray-700">
              Upon termination, your right to use the Service ceases immediately. Historical data may be retained for record-keeping purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p className="text-gray-700">
              These Terms of Service are governed by and construed in accordance with the laws of Ireland. Any disputes arising from these terms or the Service shall be subject to the exclusive jurisdiction of the Irish courts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p className="text-gray-700">
              DMRT reserves the right to modify these Terms of Service at any time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">14. Contact Information</h2>
            <p className="text-gray-700 mb-3">
              For questions about these Terms of Service, please contact:
            </p>
            <p className="text-gray-700">
              <strong>Donegal Mountain Rescue Team</strong><br />
              Email: <ProtectedEmail className="text-blue-600" /><br />
              Website: <a href="https://donegalmrt.ie" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">donegalmrt.ie</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">15. Severability</h2>
            <p className="text-gray-700">
              If any provision of these Terms of Service is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
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

