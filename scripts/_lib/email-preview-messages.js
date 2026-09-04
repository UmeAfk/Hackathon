import {
  briefReminderEmail,
  challengeLaunchBroadcast,
  evaluationUpdateBroadcast,
  notSelectedEmail,
  registrationEmail,
  shortlistedEmail,
  submissionReceiptEmail
} from '../../api/_lib/email-templates.js';

const sampleParticipant = {
  name: 'Aarav Sharma',
  email: 'aarav@example.com'
};

export function personalizePreview(message) {
  const replace = value => String(value || '')
    .replaceAll('{{{contact.first_name|there}}}', 'Aarav')
    .replaceAll('{{{contact.access_url}}}', 'http://127.0.0.1:3000/?debug=1&phase=2');
  return { ...message, html: replace(message.html), text: replace(message.text) };
}

export function emailPreviewMessages() {
  return [
    {
      slug: 'registration',
      label: 'Registration confirmation',
      message: registrationEmail(sampleParticipant, 'preview-token-not-valid-' + 'x'.repeat(24))
    },
    {
      slug: 'challenge-launch',
      label: 'Challenge task and brief',
      message: personalizePreview(challengeLaunchBroadcast())
    },
    {
      slug: 'brief-reminder',
      label: 'Design brief reminder',
      message: briefReminderEmail(sampleParticipant, 'preview-token-not-valid-' + 'y'.repeat(24))
    },
    {
      slug: 'submission-receipt',
      label: 'Submission confirmation',
      message: submissionReceiptEmail(sampleParticipant, {
        id: 'ENT-2K26-PREVIEW-001',
        original_filename: 'Aarav_Sharma.zip'
      })
    },
    {
      slug: 'evaluation-update',
      label: 'Evaluation update',
      message: personalizePreview(evaluationUpdateBroadcast())
    },
    {
      slug: 'shortlisted',
      label: 'Shortlisted participant',
      message: shortlistedEmail(sampleParticipant, {
        presentationDate: '12 September 2026',
        presentationTime: '11:00 AM IST',
        venue: 'VK design and projects (3rd floor, Mutha Chambers, ll, Chattushringi, Gokhalenagar, Pune, Maharashtra 411016)',
        venueUrl: 'https://maps.app.goo.gl/GJiG8muwPyaqWrhU9'
      })
    },
    {
      slug: 'not-selected',
      label: 'Not selected',
      message: notSelectedEmail(sampleParticipant)
    }
  ];
}
