/**
 * VirusTotal API v3 Integration
 *
 * Free tier: 500 requests/day, 4 requests/minute
 * Used to scan skill content for malware/malicious code
 *
 * API docs: https://docs.virustotal.com/reference/overview
 */

const VT_BASE = 'https://www.virustotal.com/api/v3'

export interface ScanResult {
  status: 'clean' | 'flagged' | 'error' | 'pending'
  scanId?: string
  stats?: {
    malicious: number
    suspicious: number
    undetected: number
    harmless: number
    timeout: number
  }
  permalink?: string
  detectedBy?: string[]
  completedAt?: string
}

function getApiKey(): string | null {
  return process.env.VIRUSTOTAL_API_KEY || null
}

/**
 * Submit skill content for scanning.
 * Returns the analysis ID to poll for results.
 */
export async function submitScan(
  content: string,
  filename: string = 'SKILL.md'
): Promise<{ analysisId: string | null; error?: string }> {
  const apiKey = getApiKey()
  if (!apiKey) {
    return { analysisId: null, error: 'VIRUSTOTAL_API_KEY not configured' }
  }

  try {
    // Build multipart form data
    const boundary = '----SkillHubBoundary' + Date.now()
    const encoder = new TextEncoder()

    const contentDisposition = `Content-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/markdown\r\n\r\n`
    const prefix = `--${boundary}\r\n${contentDisposition}`
    const suffix = `\r\n--${boundary}--\r\n`

    const prefixBytes = encoder.encode(prefix)
    const contentBytes = encoder.encode(content)
    const suffixBytes = encoder.encode(suffix)

    const body = new Uint8Array(prefixBytes.length + contentBytes.length + suffixBytes.length)
    body.set(prefixBytes, 0)
    body.set(contentBytes, prefixBytes.length)
    body.set(suffixBytes, prefixBytes.length + contentBytes.length)

    const res = await fetch(`${VT_BASE}/files`, {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    })

    if (!res.ok) {
      const err = await res.text()
      return { analysisId: null, error: `VT API error ${res.status}: ${err}` }
    }

    const data = await res.json()
    const analysisId = data?.data?.id || null

    return { analysisId }
  } catch (e: any) {
    return { analysisId: null, error: e.message }
  }
}

/**
 * Get the results of a completed analysis.
 */
export async function getAnalysis(analysisId: string): Promise<ScanResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    return { status: 'error' }
  }

  try {
    const res = await fetch(`${VT_BASE}/analyses/${encodeURIComponent(analysisId)}`, {
      headers: { 'x-apikey': apiKey },
    })

    if (!res.ok) {
      return { status: 'error' }
    }

    const data = await res.json()
    const attributes = data?.data?.attributes || {}
    const vtStatus = attributes?.status

    if (vtStatus !== 'completed') {
      return { status: 'pending', scanId: analysisId }
    }

    const stats = attributes?.stats || {}
    const results: Record<string, { category: string; engine_name: string }> =
      attributes?.results || {}

    const detectedBy = Object.values(results)
      .filter((r) => r.category === 'malicious' || r.category === 'suspicious')
      .map((r) => r.engine_name)

    const isFlagged = stats.malicious > 0 || stats.suspicious > 2

    return {
      status: isFlagged ? 'flagged' : 'clean',
      scanId: analysisId,
      stats: {
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        undetected: stats.undetected || 0,
        harmless: stats.harmless || 0,
        timeout: stats.timeout || 0,
      },
      permalink: `https://www.virustotal.com/gui/file/${data?.data?.id}`,
      detectedBy,
      completedAt: new Date().toISOString(),
    }
  } catch (e: any) {
    return { status: 'error' }
  }
}

/**
 * Submit a scan and wait for results (with timeout).
 * Used for synchronous scan during upload validation.
 * Times out after maxWaitMs and returns pending status.
 */
export async function scanAndWait(
  content: string,
  filename?: string,
  maxWaitMs = 30_000
): Promise<ScanResult & { analysisId?: string }> {
  const { analysisId, error } = await submitScan(content, filename)

  if (!analysisId) {
    // VT not configured — skip scan
    if (error?.includes('not configured')) {
      return { status: 'clean' } // Treat as clean if VT not set up
    }
    return { status: 'error' }
  }

  // Poll for results
  const startTime = Date.now()
  const pollInterval = 3_000

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollInterval))
    const result = await getAnalysis(analysisId)

    if (result.status !== 'pending') {
      return { ...result, analysisId }
    }
  }

  // Timed out — return pending (will be checked asynchronously)
  return { status: 'pending', scanId: analysisId, analysisId }
}

/**
 * Quick static content check — runs immediately without API calls.
 * Catches obvious malicious patterns before even submitting to VT.
 */
export function quickSafetyCheck(content: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for executable payloads
  const dangerousPatterns = [
    { re: /\x00|\x01|\x02|\x03|\x04|\x05/, msg: 'Binary content detected in text file' },
    { re: /<\?php/i, msg: 'PHP code detected' },
    { re: /<%[\s\S]*?%>/i, msg: 'Template/script code detected' },
    { re: /javascript:\s*(?:eval|Function|setTimeout|setInterval)/i, msg: 'Obfuscated JavaScript detected' },
    {
      re: /(?:powershell|cmd\.exe|bash|sh)\s+(?:-c|-enc|-command|\/c)\s+['"`]?(?:[A-Za-z0-9+/]{50,}['"`]?|[^'"]+(?:download|invoke|iex))/i,
      msg: 'Shell command with encoded payload detected',
    },
  ]

  for (const { re, msg } of dangerousPatterns) {
    if (re.test(content)) {
      issues.push(msg)
    }
  }

  return { safe: issues.length === 0, issues }
}
