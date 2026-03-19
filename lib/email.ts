interface EmailPayload {
  to: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // In development, log to console
    console.log('[Email - not sent, RESEND_API_KEY not set]', payload.subject, '->', payload.to)
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'SkillHub <noreply@skillhub.dev>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })
}

// ---------------------------------------------------------------------------
// Email template helpers
// ---------------------------------------------------------------------------

const baseStyles = {
  body: 'margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  wrapper: 'max-width:600px;margin:0 auto;padding:32px 16px;',
  card: 'background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:32px;',
  logo: 'font-size:22px;font-weight:700;color:#a855f7;margin-bottom:24px;display:block;text-decoration:none;',
  h1: 'font-size:24px;font-weight:700;color:#ffffff;margin:0 0 8px;',
  p: 'font-size:15px;color:#a0a0a0;line-height:1.6;margin:0 0 16px;',
  highlight: 'color:#ffffff;font-weight:600;',
  divider: 'border:none;border-top:1px solid #2a2a2a;margin:24px 0;',
  badge: (color: string) =>
    `display:inline-block;padding:4px 12px;border-radius:9999px;font-size:13px;font-weight:600;background-color:${color};`,
  button:
    'display:inline-block;padding:12px 24px;background-color:#a855f7;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;margin-top:8px;',
  footer: 'font-size:12px;color:#555555;text-align:center;margin-top:24px;',
}

export function scanCompleteEmail(opts: {
  to: string
  skillName: string
  skillSlug: string
  status: 'clean' | 'flagged'
  appUrl: string
}): EmailPayload {
  const { to, skillName, skillSlug, status, appUrl } = opts
  const isClean = status === 'clean'
  const skillUrl = `${appUrl}/skills/${skillSlug}`

  const subject = isClean
    ? `Security scan passed: ${skillName}`
    : `Security scan flagged: ${skillName}`

  const badgeColor = isClean ? '#166534' : '#7f1d1d'
  const badgeText = isClean ? '&#10003; Clean' : '&#9888; Flagged'
  const badgeTextColor = isClean ? '#4ade80' : '#f87171'

  const statusMessage = isClean
    ? `Great news — your skill <span style="${baseStyles.highlight}">${skillName}</span> passed our security scan and is visible to the marketplace.`
    : `Your skill <span style="${baseStyles.highlight}">${skillName}</span> was flagged by our security scanner and has been temporarily suspended. Please review the scan results and update your skill content.`

  const actionMessage = isClean
    ? 'Your skill is now available for users to discover and install.'
    : 'If you believe this is a false positive, please contact our support team with the scan details.'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.wrapper}">
    <div style="${baseStyles.card}">
      <a href="${appUrl}" style="${baseStyles.logo}">SkillHub</a>
      <h1 style="${baseStyles.h1}">Security Scan ${isClean ? 'Passed' : 'Failed'}</h1>
      <p style="${baseStyles.p}">
        ${statusMessage}
      </p>
      <div style="margin:20px 0;">
        <span style="${baseStyles.badge(badgeColor)}color:${badgeTextColor};">${badgeText}</span>
      </div>
      <p style="${baseStyles.p}">${actionMessage}</p>
      <hr style="${baseStyles.divider}">
      <a href="${skillUrl}" style="${baseStyles.button}">View Skill</a>
    </div>
    <p style="${baseStyles.footer}">
      You received this email because you published a skill on SkillHub.<br>
      &copy; ${new Date().getFullYear()} SkillHub. All rights reserved.
    </p>
  </div>
</body>
</html>`

  return { to, subject, html }
}

export function newReviewEmail(opts: {
  to: string
  skillName: string
  skillSlug: string
  reviewerUsername: string
  rating: number
  comment: string | null
  appUrl: string
}): EmailPayload {
  const { to, skillName, skillSlug, reviewerUsername, rating, comment, appUrl } = opts
  const skillUrl = `${appUrl}/skills/${skillSlug}`

  const subject = `New ${rating}-star review on "${skillName}"`

  // Build star string: filled stars + empty stars
  const filledStar = '&#9733;'
  const emptyStar = '&#9734;'
  const stars = filledStar.repeat(rating) + emptyStar.repeat(5 - rating)

  const commentBlock = comment
    ? `<div style="background-color:#111111;border-left:3px solid #a855f7;border-radius:0 6px 6px 0;padding:14px 16px;margin:16px 0;">
        <p style="font-size:14px;color:#d4d4d4;line-height:1.6;margin:0;font-style:italic;">&ldquo;${comment}&rdquo;</p>
      </div>`
    : `<p style="${baseStyles.p}"><em>No comment was left with this review.</em></p>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.wrapper}">
    <div style="${baseStyles.card}">
      <a href="${appUrl}" style="${baseStyles.logo}">SkillHub</a>
      <h1 style="${baseStyles.h1}">New Review Received</h1>
      <p style="${baseStyles.p}">
        <span style="${baseStyles.highlight}">@${reviewerUsername}</span> left a review on your skill
        <span style="${baseStyles.highlight}">${skillName}</span>.
      </p>
      <div style="margin:20px 0;">
        <span style="font-size:28px;color:#facc15;letter-spacing:2px;">${stars}</span>
        <span style="font-size:15px;color:#a0a0a0;margin-left:8px;">${rating} out of 5</span>
      </div>
      ${commentBlock}
      <hr style="${baseStyles.divider}">
      <a href="${skillUrl}#reviews" style="${baseStyles.button}">See All Reviews</a>
    </div>
    <p style="${baseStyles.footer}">
      You received this email because someone reviewed your skill on SkillHub.<br>
      &copy; ${new Date().getFullYear()} SkillHub. All rights reserved.
    </p>
  </div>
</body>
</html>`

  return { to, subject, html }
}
