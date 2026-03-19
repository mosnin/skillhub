import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'SkillHub terms of service',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="text-muted-foreground space-y-3">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using SkillHub (&quot;the Service&quot;, &quot;Platform&quot;), you agree to be bound
            by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree to
            these Terms, do not use the Service.
          </p>
          <p>
            These Terms apply to all visitors, users, creators, and purchasers. We reserve the
            right to update these Terms at any time. Continued use of the Service after changes
            are posted constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            SkillHub is an online marketplace where creators can publish, distribute, and monetize
            AI agent skill files (SKILL.md), and where users can discover, purchase, and install
            those skills for use with compatible AI coding assistants and agent frameworks.
          </p>
          <p>
            SkillHub provides tools for publishing skills via a web interface or CLI, a marketplace
            for browsing and purchasing skills, and infrastructure for secure delivery of skill
            content to end users.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You must create an account to publish skills or purchase paid content. You are
            responsible for maintaining the confidentiality of your account credentials and for all
            activity that occurs under your account. You must be at least 13 years old to use the
            Service.
          </p>
          <p>
            You agree to provide accurate, current, and complete information during registration and
            to update that information as necessary. SkillHub reserves the right to suspend or
            terminate accounts that contain inaccurate information or that violate these Terms.
          </p>
        </Section>

        <Section title="4. Creator Responsibilities">
          <p>
            As a creator publishing skills on SkillHub, you agree to the following:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <span className="font-medium text-foreground">Accurate descriptions:</span> All skill
              names, descriptions, and metadata must accurately represent the skill&apos;s
              functionality. Misleading titles or descriptions are prohibited.
            </li>
            <li>
              <span className="font-medium text-foreground">No malicious content:</span> You must
              not publish skills that contain malware, backdoors, prompt injection attacks, or any
              content designed to harm users, exfiltrate data, or perform unauthorized actions.
            </li>
            <li>
              <span className="font-medium text-foreground">Original work:</span> You represent
              that you have the right to publish the content you submit, and that it does not
              infringe on the intellectual property rights of any third party.
            </li>
            <li>
              <span className="font-medium text-foreground">Content standards:</span> Skills must
              not contain or facilitate the generation of content that is illegal, harmful, abusive,
              harassing, defamatory, or otherwise objectionable.
            </li>
            <li>
              <span className="font-medium text-foreground">Security compliance:</span> All
              uploaded skill files are subject to automated security scanning via VirusTotal.
              Skills that fail security review will be suspended pending investigation.
            </li>
          </ul>
        </Section>

        <Section title="5. Purchases and Payments">
          <p>
            Paid skills are purchased through our integrated Stripe payment processor. By
            completing a purchase, you authorize SkillHub to charge your payment method for the
            listed price.
          </p>
          <p>
            <span className="font-medium text-foreground">No refund policy:</span> All sales of
            digital skill files are final. Because skill content is delivered immediately upon
            purchase, we generally do not offer refunds. Exceptions are made only in cases where
            the skill was materially misrepresented, technically non-functional due to a platform
            error, or the purchase was fraudulent. To request an exception, contact{' '}
            <a
              href="mailto:support@skillhub.dev"
              className="text-primary underline underline-offset-2"
            >
              support@skillhub.dev
            </a>{' '}
            within 7 days of purchase.
          </p>
          <p>
            Prices are displayed in US dollars and are set by individual creators. SkillHub is not
            responsible for pricing errors made by creators, but will cooperate in resolving
            disputes.
          </p>
        </Section>

        <Section title="6. Revenue Share">
          <p>
            Creators receive <span className="font-medium text-foreground">80% of the sale price</span> for
            each paid skill purchased. SkillHub retains 20% as a platform fee to cover payment
            processing, infrastructure, security scanning, and platform development.
          </p>
          <p>
            Earnings are paid out via Stripe Connect. To receive payouts, creators must complete
            Stripe&apos;s identity verification process and connect a valid bank account. Payouts
            are subject to Stripe&apos;s standard hold periods and payout schedules. SkillHub is
            not responsible for delays caused by Stripe&apos;s processing or your bank.
          </p>
          <p>
            Free skills do not generate revenue. SkillHub reserves the right to modify the revenue
            share percentage with 30 days&apos; notice to affected creators.
          </p>
        </Section>

        <Section title="7. Licenses">
          <p>
            By publishing a skill on SkillHub, you grant SkillHub a non-exclusive, worldwide,
            royalty-free license to host, display, distribute, and deliver your skill content to
            users who download or purchase it.
          </p>
          <p>
            When a user downloads a free skill or purchases a paid skill, they receive a
            non-exclusive, non-transferable license to use that skill for their own personal or
            commercial purposes. Users may not redistribute, resell, or sublicense skill content
            obtained through SkillHub.
          </p>
          <p>
            Creators retain all copyright and intellectual property rights in the skills they
            publish.
          </p>
        </Section>

        <Section title="8. Prohibited Content and Conduct">
          <p>The following are strictly prohibited on SkillHub:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Skills containing malware, viruses, spyware, or any malicious code</li>
            <li>Skills designed to perform prompt injection, jailbreaking, or bypass AI safety measures</li>
            <li>Skills that facilitate illegal activity, including hacking, fraud, or harassment</li>
            <li>Content that violates the intellectual property rights of others</li>
            <li>Skills that generate or facilitate child sexual abuse material (CSAM)</li>
            <li>Impersonating other creators, users, or SkillHub staff</li>
            <li>Manipulating download counts, ratings, or reviews through artificial means</li>
            <li>Using the API or CLI in ways that abuse or overload SkillHub infrastructure</li>
          </ul>
          <p>
            Violations may result in immediate content removal, account suspension, or permanent
            termination, at SkillHub&apos;s sole discretion.
          </p>
        </Section>

        <Section title="9. Content Moderation">
          <p>
            SkillHub reviews all published skills through automated security scanning and reserves
            the right to review, remove, or suspend any skill that violates these Terms or our
            content policies. We may suspend a skill pending investigation without prior notice if
            we have reason to believe it poses a risk to users.
          </p>
          <p>
            If your skill is suspended and you believe this was done in error, contact{' '}
            <a
              href="mailto:support@skillhub.dev"
              className="text-primary underline underline-offset-2"
            >
              support@skillhub.dev
            </a>{' '}
            with an explanation and we will review your case within 5 business days.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You may terminate your account at any time by contacting us. Upon termination, your
            published skills will be removed from the marketplace and your profile will be
            deactivated.
          </p>
          <p>
            SkillHub may suspend or terminate your account at any time, with or without notice, for
            violation of these Terms, for conduct that we determine to be harmful to other users,
            or for any other reason at our sole discretion.
          </p>
          <p>
            Pending creator earnings at the time of termination will be paid out within 30 days,
            provided the account was not terminated for fraud or violation of payment terms.
          </p>
        </Section>

        <Section title="11. Disclaimers">
          <p>
            SkillHub provides the marketplace &quot;as is&quot; and &quot;as available&quot; without warranties of
            any kind, express or implied. We do not warrant that the Service will be uninterrupted,
            error-free, or free from viruses or other harmful components.
          </p>
          <p>
            Skills published on SkillHub are created by independent third parties. SkillHub does
            not endorse, guarantee, or warrant any skill content. You use downloaded skills at your
            own risk. Always review skill content before deploying it in any production or sensitive
            environment.
          </p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, SkillHub and its officers,
            directors, employees, and agents shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages, including loss of profits, data, or
            goodwill, arising from your use of or inability to use the Service or any skill content
            obtained through the Service.
          </p>
          <p>
            In no event shall SkillHub&apos;s total liability to you exceed the greater of (a) the
            amount you paid to SkillHub in the 12 months preceding the claim, or (b) one hundred
            US dollars ($100).
          </p>
        </Section>

        <Section title="13. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless SkillHub and its affiliates from any
            claims, damages, losses, liabilities, costs, and expenses (including reasonable
            attorneys&apos; fees) arising from: (a) your use of the Service; (b) your violation of
            these Terms; (c) your skill content; or (d) your infringement of any third-party
            rights.
          </p>
        </Section>

        <Section title="14. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of
            California, United States, without regard to its conflict of law provisions. You agree
            to submit to the exclusive jurisdiction of the courts located in San Francisco County,
            California for the resolution of any disputes arising from these Terms or your use of
            the Service.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            For questions about these Terms, contact us at:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Email:{' '}
              <a
                href="mailto:legal@skillhub.dev"
                className="text-primary underline underline-offset-2"
              >
                legal@skillhub.dev
              </a>
            </li>
            <li>Website: skillhub.dev</li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
