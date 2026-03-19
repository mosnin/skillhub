import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'SkillHub privacy policy',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="text-muted-foreground space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <Section title="Introduction">
          <p>
            SkillHub (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates a marketplace for AI agent skills and
            prompts. This Privacy Policy explains what personal information we collect, how we use
            it, and the choices you have regarding your information. By using SkillHub, you agree to
            the practices described in this policy.
          </p>
        </Section>

        <Section title="What We Collect">
          <p>We collect information in the following ways:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <span className="font-medium text-foreground">Account information:</span> When you
              sign up via Clerk, we receive your email address, username, and profile avatar. If you
              sign in through a third-party OAuth provider (such as GitHub or Google), we receive
              the public profile information that provider shares with us.
            </li>
            <li>
              <span className="font-medium text-foreground">Creator profile:</span> Optional
              information you add to your public profile, including a bio and display name.
            </li>
            <li>
              <span className="font-medium text-foreground">Skill content:</span> The SKILL.md
              files, descriptions, metadata, and README content you upload or publish to the
              marketplace.
            </li>
            <li>
              <span className="font-medium text-foreground">Payment information:</span> When you
              purchase a paid skill or set up a creator payout account, we collect billing
              information through Stripe. We do not store raw card numbers or bank account details
              on our servers.
            </li>
            <li>
              <span className="font-medium text-foreground">Usage data:</span> Download counts,
              search queries, page views, and other interaction data that help us understand how
              SkillHub is used.
            </li>
            <li>
              <span className="font-medium text-foreground">API keys:</span> If you generate
              SkillHub API keys for CLI access, we store a hashed reference to those keys.
            </li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Create and maintain your account and public creator profile</li>
            <li>Process purchases and pay out creator earnings via Stripe</li>
            <li>Display published skills and attribution on the marketplace</li>
            <li>Run security scans on uploaded skill content to protect our users</li>
            <li>Send transactional emails (purchase receipts, payout confirmations)</li>
            <li>Detect and prevent fraud, abuse, and violations of our Terms of Service</li>
            <li>Improve and develop the SkillHub platform and user experience</li>
            <li>Comply with applicable legal obligations</li>
          </ul>
          <p>
            We do not sell your personal information to third parties. We do not use your data to
            serve behaviorally targeted advertising.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>
            SkillHub relies on the following third-party services to operate. Each has its own
            privacy policy governing data it processes:
          </p>

          <div className="space-y-4 mt-1">
            <div>
              <h3 className="font-medium text-foreground mb-1">Clerk (Authentication)</h3>
              <p>
                We use Clerk to manage user authentication and sessions. When you create an account
                or sign in, Clerk processes your email address, password (if applicable), and
                OAuth tokens. Clerk stores session data on your device in the form of cookies or
                local storage. See{' '}
                <a
                  href="https://clerk.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Clerk&apos;s Privacy Policy
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-1">Stripe (Payments)</h3>
              <p>
                Payments are processed by Stripe. When you make a purchase or enroll as a creator
                with payouts, Stripe collects and stores your financial information under their own
                PCI-DSS compliant infrastructure. SkillHub receives only a payment intent ID and
                status from Stripe — we never see or store your full card number or bank routing
                details. See{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Stripe&apos;s Privacy Policy
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-1">VirusTotal (Content Scanning)</h3>
              <p>
                All skill files uploaded to SkillHub are submitted to VirusTotal for security
                analysis. This means the content of your SKILL.md file is shared with VirusTotal
                and may be retained by them according to their own policies. Do not include
                sensitive secrets or private data in skill files. See{' '}
                <a
                  href="https://support.virustotal.com/hc/en-us/articles/115002168385-Privacy-Policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  VirusTotal&apos;s Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </Section>

        <Section title="Cookies and Tracking">
          <p>
            SkillHub uses cookies and similar technologies solely for functional purposes —
            maintaining your authenticated session and remembering your preferences. We do not use
            third-party advertising cookies or cross-site tracking pixels.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your account information and published skills for as long as your account
            remains active. If you delete your account, we will remove your personal profile
            information within 30 days. Published skills may be archived or removed from the
            marketplace at the time of account deletion.
          </p>
          <p>
            Purchase records are retained for seven years to meet accounting and tax compliance
            requirements, even after account deletion. Anonymized usage analytics are retained
            indefinitely.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, export, or
            delete the personal data we hold about you. You can update your profile information at
            any time from your account settings. To request deletion of your account and associated
            data, contact us at the address below.
          </p>
          <p>
            If you are in the European Economic Area, you have additional rights under the GDPR,
            including the right to lodge a complaint with your local data protection authority.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            SkillHub is not directed at children under the age of 13. We do not knowingly collect
            personal information from children. If you believe a child has created an account on
            our platform, please contact us and we will promptly remove the account.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            &quot;Last updated&quot; date at the top of this page and, for material changes, notify
            you via email or a prominent notice on the platform.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            If you have questions about this Privacy Policy or how we handle your data, please
            contact us:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Email:{' '}
              <a
                href="mailto:privacy@skillhub.dev"
                className="text-primary underline underline-offset-2"
              >
                privacy@skillhub.dev
              </a>
            </li>
            <li>Website: skillhub.dev</li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
