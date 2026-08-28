import { getEventConfig } from './event.js';

const colors = {
  ink: '#211a12', cream: '#f1e6d0', paper: '#fbf3e3', white: '#fffaf0', tomato: '#e6552e',
  mustard: '#efb13d', olive: '#6e7c3f', muted: '#4a4034'
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

function formatIstHtml(value) {
  const formatted = formatIst(value);
  const parts = formatted.match(/^(.*?)(\s+at\s+.*)$/i);
  if (!parts) return escapeHtml(formatted);
  return `${escapeHtml(parts[1])} <span style="white-space:nowrap">${escapeHtml(parts[2].trim())}</span>`;
}

function dayIst(value) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

function calendarIcon(day) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="width:30px;border:2px solid ${colors.ink};background:${colors.paper}"><tr><td height="7" style="height:7px;background:${colors.tomato};border-bottom:2px solid ${colors.ink};font-size:1px;line-height:1px">&nbsp;</td></tr><tr><td align="center" style="padding:3px 0 2px;font-family:'Courier New',monospace;font-size:12px;line-height:1;font-weight:700;color:${colors.ink}">${escapeHtml(day)}</td></tr></table>`;
}

function symbolIcon(symbol, label) {
  return `<span role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="display:inline-block;width:30px;height:30px;border:2px solid ${colors.ink};background:${colors.paper};font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;font-weight:700;text-align:center;color:${colors.ink}">${escapeHtml(symbol)}</span>`;
}

function uploadIcon() {
  return symbolIcon('↥', 'Upload');
}

function presentationIcon() {
  return symbolIcon('▤', 'Presentation');
}

function locationIcon() {
  return symbolIcon('📍', 'Location');
}

function informationCard(label, value, accent = colors.tomato, icon = '●') {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 12px;border:2px solid ${colors.ink};background:${colors.white};table-layout:fixed">
    <tr><td class="info-icon" width="62" align="center" style="width:62px;background:${accent};border-right:2px solid ${colors.ink};font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:${colors.ink}">${icon}</td>
    <td class="info-copy" style="padding:14px 16px;word-break:normal"><div class="info-label" style="margin:0 0 5px;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${colors.muted}">${escapeHtml(label)}</div>
    <div class="info-value" style="font-size:16px;line-height:1.35;font-weight:800;color:${colors.ink}">${value}</div></td></tr>
  </table>`;
}

function layout({ preheader, eyebrow, counter = '01 / 01', title, intro, body, buttonLabel, buttonUrl, footer }) {
  const safeUrl = escapeHtml(buttonUrl);
  const footerContent = footer || 'Reply to this message if you need help.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(eyebrow)}</title><style type="text/css">
@media only screen and (max-width:600px){.email-outer{padding:12px 8px 24px!important}.email-card{width:100%!important;box-shadow:5px 5px 0 ${colors.tomato}!important}.email-header{padding:12px 16px!important}.email-body{padding:26px 18px 10px!important}.email-actions{padding:8px 18px 28px!important}.email-title{font-size:32px!important;line-height:1.06!important;letter-spacing:-.8px!important}.email-intro{font-size:16px!important;line-height:1.55!important}.info-icon{width:50px!important}.info-copy{padding:12px!important}.info-label{font-size:10px!important;letter-spacing:1px!important}.info-value{font-size:15px!important}.email-footer{padding:16px 18px!important;font-size:14px!important}}
</style></head>
<body style="margin:0;padding:0;background:${colors.cream};font-family:Arial,Helvetica,sans-serif;color:${colors.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${colors.cream}" style="width:100%;background:${colors.cream}"><tr><td class="email-outer" align="center" style="padding:28px 12px 38px">
<table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${colors.paper}" style="width:100%;max-width:640px;background:${colors.paper};border:3px solid ${colors.ink};box-shadow:9px 9px 0 ${colors.tomato}">
<tr><td class="email-header" bgcolor="${colors.mustard}" style="padding:14px 22px;border-bottom:3px solid ${colors.ink}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:1.5px;color:${colors.ink}">[ ENTANGLE 2K26 ]</td><td align="right" style="font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:${colors.ink}">${escapeHtml(counter)}</td></tr></table></td></tr>
<tr><td class="email-body" style="padding:34px 30px 14px"><div style="display:inline-block;padding:7px 10px;background:${colors.tomato};border:2px solid ${colors.ink};font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:1.3px;color:#ffffff">${escapeHtml(eyebrow)}</div>
<h1 class="email-title" style="margin:20px 0 14px;font-size:40px;line-height:1.04;letter-spacing:-1.4px;color:${colors.ink}">${title}</h1><div style="width:76px;height:6px;background:${colors.ink};margin:0 0 20px">&nbsp;</div>
<p class="email-intro" style="margin:0 0 24px;font-size:17px;line-height:1.6;color:${colors.ink}">${intro}</p>${body}</td></tr>
<tr><td class="email-actions" style="padding:10px 30px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td bgcolor="${colors.tomato}" align="center" style="border:2px solid ${colors.ink};box-shadow:5px 5px 0 ${colors.ink}"><a href="${safeUrl}" style="display:block;padding:16px 18px;color:#ffffff;text-decoration:none;font-size:16px;line-height:1.2;font-weight:800">${escapeHtml(buttonLabel)} &nbsp;→</a></td></tr></table></td></tr>
<tr><td class="email-footer" bgcolor="${colors.cream}" style="padding:18px 30px;border-top:3px solid ${colors.ink};color:${colors.muted};font-size:14px;line-height:1.6"><div style="margin:0 0 5px;font-family:'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:1px;color:${colors.tomato}">[ VASTUCHITRA / ENTANGLE ]</div>${footerContent}</td></tr>
</table></td></tr></table></body></html>`;
}

export function accessUrl(token) {
  const { siteUrl } = getEventConfig();
  return `${siteUrl}/#entry=${encodeURIComponent(token)}`;
}

export function registrationEmail(participant, token) {
  const config = getEventConfig();
  const pageUrl = accessUrl(token);
  return {
    subject: `Registration confirmed — ${config.eventName}`,
    html: layout({
      preheader: 'You’re officially on the Entangle 2K26 list.',
      eyebrow: 'REGISTRATION / CONFIRMED', counter: '01 / ENTRY',
      title: `You’re on the list,<br>${firstName(participant.name)}.`,
      intro: 'Congratulations! Your registration for Entangle 2K26 is confirmed. Watch your inbox on 4 September at 11:59 AM IST. We have a surprise waiting for you.',
      body: `<p style="margin:0;font-size:16px;line-height:1.6;color:${colors.muted}">Until then, get ready to Imagine. Build. Entangle.</p>`,
      buttonLabel: 'Visit Website', buttonUrl: pageUrl
    }),
    text: `Registration confirmed — ${config.eventName}\n\nYou’re on the list, ${firstNameRaw(participant.name)}.\n\nCongratulations! Your registration for Entangle 2K26 is confirmed. Watch your inbox on 4 September at 11:59 AM IST. We have a surprise waiting for you.\n\nUntil then, get ready to Imagine. Build. Entangle.\n\nVisit Website: ${pageUrl}`
  };
}

export function submissionReceiptEmail(participant, submission) {
  const config = getEventConfig();
  const filename = String(submission.original_filename || 'Project archive');
  return {
    subject: `Submission received — ${config.eventName}`,
    html: layout({
      preheader: 'Your Entangle project files were uploaded successfully.',
      eyebrow: 'SUBMISSION / RECEIVED', counter: '03 / RECEIVED',
      title: `Files received,<br>${firstName(participant.name)}.`,
      intro: 'Your upload was completed successfully. We have received your project archive and it is ready for the evaluation team.',
      body: `${informationCard('Uploaded archive', escapeHtml(filename), colors.mustard, uploadIcon())}<p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:${colors.muted}">No further upload action is needed. Please keep your original project files available in case our team contacts you during verification.</p>`,
      buttonLabel: 'Visit Website', buttonUrl: config.siteUrl
    }),
    text: `Submission received — ${config.eventName}\n\nFiles received, ${firstNameRaw(participant.name)}.\n\nYour upload was completed successfully. We received your project archive and it is ready for evaluation.\n\nUploaded archive: ${filename}\n\nNo further upload action is needed. Please keep your original project files available in case our team contacts you during verification.\n\nVisit Website: ${config.siteUrl}`
  };
}

export function challengeLaunchBroadcast() {
  const config = getEventConfig();
  const deadline = formatIst(config.submissionDeadlineAt);
  const pageUrl = '{{{contact.access_url}}}';
  return {
    name: 'Entangle 2K26 — Challenge launch',
    subject: 'The challenge is live — Entangle 2K26',
    html: layout({
      preheader: 'The Entangle 2K26 challenge brief and files are ready.',
      eyebrow: 'CHALLENGE / LIVE', counter: '02 / BUILD',
      title: 'The brief<br>has dropped.',
      intro: 'Hi {{{contact.first_name|there}}}, the Entangle 2K26 challenge is now live. Create a compelling real-time architectural experience through materials, lighting, environment design, camera composition, and visual storytelling. Interactivity is optional.',
      body: `${informationCard('Final submission deadline', formatIstHtml(config.submissionDeadlineAt), colors.mustard, calendarIcon(dayIst(config.submissionDeadlineAt)))}<p style="margin:18px 0;font-size:15px;line-height:1.65;color:${colors.ink}">Use any supporting software in your workflow. Complete the final environment, materials, scene, camera setup, and renders in <strong>Unreal Engine 5</strong>. Any interactive elements you choose to include must also be built there.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0;border:2px dashed ${colors.ink}"><tr><td style="padding:16px;font-size:14px;line-height:1.75"><strong>Start here:</strong><br>01 — Visit the website and download the challenge PDF and files<br>02 — Read the complete task and supporting references<br>03 — Share a short creative brief after downloading<br>04 — Build, package, and upload before the deadline</td></tr></table><p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${colors.muted}">Your creative brief helps us understand the concept, mood, and experience you intended before we see the finished project.</p>`,
      buttonLabel: 'Visit Website', buttonUrl: pageUrl
    }),
    text: `The challenge is live — Entangle 2K26\n\nHi {{{contact.first_name|there}}},\n\nThe challenge PDF, supporting references, and project files are ready on the website. Use any supporting software in your workflow, but complete and submit the final Unreal Engine 5 project.\n\nSubmission deadline: ${deadline}\n\nVisit Website: ${pageUrl}`
  };
}

export function evaluationUpdateBroadcast() {
  const config = getEventConfig();
  return {
    name: 'Entangle 2K26 — Evaluation update',
    subject: 'The final selection is taking shape — Entangle 2K26',
    html: layout({
      preheader: 'The Entangle 2K26 jury is reviewing the submissions.',
      eyebrow: 'JURY / REVIEW', counter: '04 / REVIEW',
      title: 'The jury<br>is watching.',
      intro: 'Hi {{{contact.first_name|there}}}, the jury is reviewing the Entangle 2K26 submissions, and the final selection is taking shape.',
      body: `<p style="margin:0;font-size:16px;line-height:1.65;color:${colors.muted}">Thank you for the imagination, energy, and effort you brought to the challenge. Keep an eye on your inbox.</p>`,
      buttonLabel: 'Visit Website', buttonUrl: config.siteUrl
    }),
    text: `The final selection is taking shape — Entangle 2K26\n\nHi {{{contact.first_name|there}}},\n\nThe jury is reviewing the submissions. Thank you for the imagination, energy, and effort you brought to the challenge. Keep an eye on your inbox.\n\nVisit Website: ${config.siteUrl}`
  };
}

export function shortlistedEmail(participant, details = {}) {
  const config = getEventConfig();
  const presentationDate = String(details.presentationDate || 'To be confirmed');
  const presentationTime = String(details.presentationTime || 'To be confirmed');
  const venue = String(details.venue || 'VK design and projects (3rd floor, Mutha Chambers, ll, Chattushringi, Gokhalenagar, Pune, Maharashtra 411016)');
  const venueUrl = String(details.venueUrl || 'https://maps.app.goo.gl/GJiG8muwPyaqWrhU9');
  const venueLink = `<a href="${escapeHtml(venueUrl)}" target="_blank" rel="noopener noreferrer" style="color:${colors.ink};text-decoration:underline;text-decoration-color:${colors.tomato};text-decoration-thickness:2px;text-underline-offset:3px">${escapeHtml(venue)}</a>`;
  return {
    subject: 'Your submission has been shortlisted — Entangle 2K26',
    html: layout({
      preheader: 'Your Entangle 2K26 submission has advanced to the next stage.',
      eyebrow: 'SELECTION / SHORTLISTED', counter: '05 / NEXT',
      title: `Congratulations,<br>${firstName(participant.name)}.`,
      intro: 'Your submission has been shortlisted for the next stage of Entangle 2K26. We would like to invite you to present your project and explain the creative and technical decisions behind it.',
      body: `${informationCard('Presentation', `${escapeHtml(presentationDate)} · ${escapeHtml(presentationTime)}`, colors.mustard, presentationIcon())}${informationCard('Location', venueLink, colors.olive, locationIcon())}`,
      buttonLabel: 'Visit Website', buttonUrl: config.siteUrl
    }),
    text: `Your submission has been shortlisted — Entangle 2K26\n\nCongratulations, ${firstNameRaw(participant.name)}.\n\nYour submission has advanced to the next stage.\n\nPresentation: ${presentationDate} · ${presentationTime}\nLocation: ${venue}\nMap: ${venueUrl}\n\nPlease reply to confirm your availability.\n\nVisit Website: ${config.siteUrl}`
  };
}

export function notSelectedEmail(participant) {
  const config = getEventConfig();
  return {
    subject: 'An update on your Entangle 2K26 submission',
    html: layout({
      preheader: 'An update regarding your Entangle 2K26 submission.',
      eyebrow: 'SELECTION / UPDATE', counter: '05 / UPDATE',
      title: `Thank you,<br>${firstName(participant.name)}.`,
      intro: 'Thank you for participating in Entangle 2K26 and for sharing your work with us. Following the jury’s review, your submission was not selected to advance to the next stage of this edition of the hackathon.',
      body: `<p style="margin:0;font-size:16px;line-height:1.65;color:${colors.muted}">We recognise the time, thought, and creative effort involved in completing a project of this nature, and we sincerely appreciate your contribution. We hope you continue developing your ideas and exploring real-time visualization.</p>`,
      buttonLabel: 'Visit Website', buttonUrl: config.siteUrl
    }),
    text: `An update on your Entangle 2K26 submission\n\nHi ${firstNameRaw(participant.name)},\n\nThank you for participating and sharing your work. Following the jury’s review, your submission was not selected to advance to the next stage of this edition of the hackathon.\n\nWe recognise the time, thought, and creative effort involved and sincerely appreciate your contribution. We hope you continue developing your ideas and exploring real-time visualization.\n\nVisit Website: ${config.siteUrl}`
  };
}
