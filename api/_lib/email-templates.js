import { getEventConfig } from './event.js';

const colors = { ink: '#161613', paper: '#f2eadc', tomato: '#e95d3f', mustard: '#e9bd41' };

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function firstName(name) {
  return escapeHtml(String(name || 'there').trim().split(/\s+/)[0]);
}

function formatIst(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
  }).format(new Date(value));
}

function layout({ eyebrow, title, intro, body, buttonLabel, buttonUrl, footer }) {
  const safeUrl = escapeHtml(buttonUrl);
  return `<!doctype html><html><body style="margin:0;background:${colors.ink};font-family:Arial,sans-serif;color:${colors.ink}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colors.ink};padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:${colors.paper};border:3px solid ${colors.ink};box-shadow:8px 8px 0 ${colors.tomato}">
    <tr><td style="padding:34px 32px 14px"><div style="font-size:13px;font-weight:800;letter-spacing:2px;color:${colors.tomato}">[ ${escapeHtml(eyebrow)} ]</div>
    <h1 style="font-size:36px;line-height:1.05;margin:14px 0 16px;letter-spacing:-1px">${title}</h1>
    <p style="font-size:18px;line-height:1.55;margin:0 0 18px">${intro}</p>${body}</td></tr>
    <tr><td style="padding:10px 32px 34px"><a href="${safeUrl}" style="display:inline-block;background:${colors.tomato};color:white;text-decoration:none;font-weight:800;border:2px solid ${colors.ink};padding:14px 22px;box-shadow:4px 4px 0 ${colors.ink}">${escapeHtml(buttonLabel)} →</a></td></tr>
    <tr><td style="background:${colors.mustard};border-top:3px solid ${colors.ink};padding:18px 32px;font-size:12px;line-height:1.5">${footer || 'You received this operational event email because you registered for the Entangle ArchViz Challenge.'}</td></tr>
  </table></td></tr></table></body></html>`;
}

export function accessUrl(token) {
  const { siteUrl } = getEventConfig();
  return `${siteUrl}/#entry=${encodeURIComponent(token)}`;
}

export function registrationEmail(participant, token) {
  const config = getEventConfig();
  return {
    subject: `You're registered — ${config.eventName}`,
    html: layout({
      eyebrow: 'REGISTRATION CONFIRMED',
      title: `You’re in, ${firstName(participant.name)}.`,
      intro: 'Your place in the challenge is locked. Keep this email—its button securely connects your registration to your submission.',
      body: `<div style="border:2px solid ${colors.ink};padding:16px;margin:22px 0;background:white"><strong>Task drops</strong><br>${escapeHtml(formatIst(config.taskDropsAt))}<br><br><strong>Submission deadline</strong><br>${escapeHtml(formatIst(config.submissionDeadlineAt))}</div>`,
      buttonLabel: 'Open my challenge page',
      buttonUrl: accessUrl(token)
    })
  };
}

export function submissionReceiptEmail(participant, submission) {
  const config = getEventConfig();
  return {
    subject: `Submission received — ${config.eventName}`,
    html: layout({
      eyebrow: 'UPLOAD COMPLETE',
      title: `We have it, ${firstName(participant.name)}.`,
      intro: 'Your archive has been securely stored and logged for evaluation.',
      body: `<div style="border:2px solid ${colors.ink};padding:16px;margin:22px 0;background:white"><strong>File</strong><br>${escapeHtml(submission.original_filename)}<br><br><strong>Receipt ID</strong><br>${escapeHtml(submission.id)}</div><p style="font-size:15px;line-height:1.5">Keep your original project and proof-of-process files. The organizers may request them during verification.</p>`,
      buttonLabel: 'View challenge page',
      buttonUrl: config.siteUrl
    })
  };
}
