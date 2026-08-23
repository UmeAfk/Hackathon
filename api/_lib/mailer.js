function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Resend is not configured.');
  return {
    apiKey,
    from: 'Entangle 2K26 <entangle2k26@vkarch.com>',
    replyTo: 'entangle2k26@vkarch.com'
  };
}

function payloadFor(to, message) {
  const { from, replyTo } = emailConfig();
  return {
    from,
    to: [to],
    subject: message.subject,
    html: message.html,
    ...(replyTo ? { reply_to: replyTo } : {})
  };
}

async function resendRequest(path, body, idempotencyKey) {
  const { apiKey } = emailConfig();
  const response = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey.slice(0, 256)
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error?.message || `Resend returned ${response.status}`);
  return data;
}

export async function sendEmail(to, message, idempotencyKey) {
  return resendRequest('/emails', payloadFor(to, message), idempotencyKey);
}
