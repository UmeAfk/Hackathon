import { getEventConfig } from './event.js';

const colors = {
  ink: '#161613', paper: '#f6eedf', white: '#fffaf0', tomato: '#ec552f',
  mustard: '#f2b632', olive: '#68733f', muted: '#5f584e'
};

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function firstNameRaw(name) {
  return String(name || 'there').trim().split(/\s+/)[0] || 'there';
}

function firstName(name) {
  return escapeHtml(firstNameRaw(name));
}

function formatIst(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
  }).format(new Date(value));
}

function informationCard(label, value, accent = colors.tomato) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;border:2px solid ${colors.ink};background:${colors.white}">
    <tr><td width="54" align="center" style="background:${accent};border-right:2px solid ${colors.ink};font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:${colors.ink}">●</td>
    <td style="padding:14px 16px"><div style="margin:0 0 5px;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${colors.muted}">${escapeHtml(label)}</div>
    <div style="font-size:16px;line-height:1.35;font-weight:800;color:${colors.ink}">${value}</div></td></tr>
  </table>`;
}

function layout({ preheader, eyebrow, counter = '01 / 01', title, intro, body, buttonLabel, buttonUrl, footer }) {
  const safeUrl = escapeHtml(buttonUrl);
  const footerContent = footer || 'Operational email for registered Entangle 2K26 participants. Reply to this message if you need help.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(eyebrow)}</title></head>
<body style="margin:0;padding:0;background:${colors.ink};font-family:Arial,Helvetica,sans-serif;color:${colors.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${colors.ink}" style="width:100%;background:${colors.ink}"><tr><td align="center" style="padding:28px 12px 38px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${colors.paper}" style="width:100%;max-width:640px;background:${colors.paper};border:3px solid ${colors.ink};box-shadow:9px 9px 0 ${colors.tomato}">
<tr><td bgcolor="${colors.mustard}" style="padding:14px 22px;border-bottom:3px solid ${colors.ink}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;color:${colors.ink}">[ ENTANGLE 2K26 ]</td><td align="right" style="font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:${colors.ink}">${escapeHtml(counter)}</td></tr></table></td></tr>
<tr><td style="padding:34px 30px 14px"><div style="display:inline-block;padding:7px 10px;background:${colors.tomato};border:2px solid ${colors.ink};font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:1.3px;color:#ffffff">${escapeHtml(eyebrow)}</div>
<h1 style="margin:20px 0 14px;font-size:40px;line-height:1.04;letter-spacing:-1.4px;color:${colors.ink}">${title}</h1><div style="width:76px;height:6px;background:${colors.ink};margin:0 0 20px">&nbsp;</div>
<p style="margin:0 0 24px;font-size:17px;line-height:1.6;color:${colors.ink}">${intro}</p>${body}</td></tr>
<tr><td style="padding:10px 30px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td bgcolor="${colors.tomato}" align="center" style="border:2px solid ${colors.ink};box-shadow:5px 5px 0 ${colors.ink}"><a href="${safeUrl}" style="display:block;padding:16px 18px;color:#ffffff;text-decoration:none;font-size:16px;line-height:1.2;font-weight:800">${escapeHtml(buttonLabel)} &nbsp;→</a></td></tr></table>
<p style="margin:20px 0 0;font-size:12px;line-height:1.55;color:${colors.muted}">Button not working? Copy this secure link:<br><a href="${safeUrl}" style="color:${colors.tomato};word-break:break-all">${safeUrl}</a></p></td></tr>
<tr><td bgcolor="${colors.ink}" style="padding:20px 30px;color:${colors.paper};font-size:12px;line-height:1.6"><div style="margin:0 0 6px;font-family:'Courier New',monospace;font-weight:700;letter-spacing:1px;color:${colors.mustard}">[ VASTUCHITRA / ENTANGLE ]</div>${footerContent}</td></tr>
</table></td></tr></table></body></html>`;
}

export function accessUrl(token) {
  const { siteUrl } = getEventConfig();
  return `${siteUrl}/#entry=${encodeURIComponent(token)}`;
}

export function registrationEmail(participant, token) {
  const config = getEventConfig();
  const taskDrop = formatIst(config.taskDropsAt);
  const deadline = formatIst(config.submissionDeadlineAt);
  const pageUrl = accessUrl(token);
  return {
    subject: `Registration confirmed — ${config.eventName}`,
    html: layout({
      preheader: `Your Entangle registration is confirmed. Task drops ${taskDrop}.`,
      eyebrow: 'REGISTRATION / CONFIRMED', counter: '01 / ENTRY',
      title: `You’re on the list,<br>${firstName(participant.name)}.`,
      intro: 'Your registration is locked in. This email contains your private challenge link—keep it close and use the same link when you return to submit.',
      body: `${informationCard('Task drops', escapeHtml(taskDrop), colors.mustard)}${informationCard('Submission deadline', escapeHtml(deadline), colors.olive)}`,
      buttonLabel: 'Open my challenge page', buttonUrl: pageUrl
    }),
    text: `Registration confirmed — ${config.eventName}\n\nYou’re on the list, ${firstNameRaw(participant.name)}.\n\nTask drops: ${taskDrop}\nSubmission deadline: ${deadline}\n\nOpen your private challenge page: ${pageUrl}\n\nKeep this link private. Reply to this email if you need help.`
  };
}

export function submissionReceiptEmail(participant, submission) {
  const config = getEventConfig();
  const filename = String(submission.original_filename || 'Project archive');
  const receiptId = String(submission.id || 'Unavailable');
  return {
    subject: `Submission received — ${config.eventName}`,
    html: layout({
      preheader: 'Your Entangle project archive has been received and logged.',
      eyebrow: 'SUBMISSION / RECEIVED', counter: '02 / COMPLETE',
      title: `Upload complete,<br>${firstName(participant.name)}.`,
      intro: 'Your archive is securely stored and logged for evaluation. Save this email as your submission receipt.',
      body: `${informationCard('Archive', escapeHtml(filename), colors.mustard)}${informationCard('Receipt ID', `<span style="font-family:'Courier New',monospace;font-size:14px;word-break:break-all">${escapeHtml(receiptId)}</span>`, colors.olive)}<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:${colors.muted}">Keep your original project and proof-of-process files available in case the jury requests verification.</p>`,
      buttonLabel: 'Return to challenge page', buttonUrl: config.siteUrl
    }),
    text: `Submission received — ${config.eventName}\n\nUpload complete, ${firstNameRaw(participant.name)}.\n\nArchive: ${filename}\nReceipt ID: ${receiptId}\n\nYour archive is securely stored and logged for evaluation. Keep your original project files available for verification.\n\nChallenge page: ${config.siteUrl}`
  };
}

export function twoDayReminderBroadcast() {
  const config = getEventConfig();
  const deadline = formatIst(config.submissionDeadlineAt);
  const pageUrl = '{{{contact.access_url}}}';
  return {
    name: 'Entangle 2K26 — Two days remaining',
    subject: 'Two days remaining — Entangle 2K26',
    html: layout({
      preheader: `Two days remain. Submit by ${deadline}.`,
      eyebrow: 'DEADLINE / TWO DAYS', counter: '48H / REMAIN',
      title: 'Two days.<br>One final push.',
      intro: 'Hi {{{contact.first_name|there}}}, use the remaining time for final polish, packaging, and an early upload. Your private entry link is ready below.',
      body: `${informationCard('Final submission deadline', escapeHtml(deadline), colors.mustard)}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0;border:2px dashed ${colors.ink}"><tr><td style="padding:16px;font-size:14px;line-height:1.65"><strong>Before you stop:</strong><br>01 — Review the final scene<br>02 — Package the deliverable<br>03 — Upload before the last-hour rush</td></tr></table>`,
      buttonLabel: 'Continue my entry', buttonUrl: pageUrl,
      footer: `You received this reminder because you registered for Entangle 2K26.<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${colors.mustard}">Unsubscribe from event broadcasts</a>`
    }),
    text: `Two days remaining — Entangle 2K26\n\nHi {{{contact.first_name|there}}},\n\nUse the remaining time for final polish, packaging, and an early upload.\n\nFinal submission deadline: ${deadline}\n\nContinue your entry: ${pageUrl}\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`
  };
}
