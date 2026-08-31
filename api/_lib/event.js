const defaults = {
  registrationOpensAt: '2026-08-31T11:59:00+05:30',
  registrationClosesAt: '2026-09-04T11:59:00+05:30',
  taskDropsAt: '2026-09-04T11:59:00+05:30',
  submissionDeadlineAt: '2026-09-09T11:59:00+05:30',
  thankYouAt: '2026-09-10T12:00:00+05:30'
};

function validDate(value, label) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${label} date`);
  return parsed;
}

export function getEventConfig() {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const automaticSiteUrl = vercelHost ? `https://${vercelHost}` : 'http://localhost:3000';
  const config = {
    registrationOpensAt: process.env.ENTANGLE_REGISTRATION_OPENS_AT || defaults.registrationOpensAt,
    registrationClosesAt: process.env.ENTANGLE_REGISTRATION_CLOSES_AT || defaults.registrationClosesAt,
    taskDropsAt: process.env.ENTANGLE_TASK_DROPS_AT || defaults.taskDropsAt,
    submissionDeadlineAt: process.env.ENTANGLE_SUBMISSION_DEADLINE_AT || defaults.submissionDeadlineAt,
    thankYouAt: process.env.ENTANGLE_THANK_YOU_AT || defaults.thankYouAt,
    eventName: 'Entangle ArchViz Challenge',
    siteUrl: automaticSiteUrl.replace(/\/$/, ''),
    maxUploadBytes: 5 * 1024 * 1024 * 1024
  };

  validDate(config.registrationOpensAt, 'registration opening');
  validDate(config.registrationClosesAt, 'registration closing');
  validDate(config.taskDropsAt, 'task drop');
  validDate(config.submissionDeadlineAt, 'submission deadline');
  validDate(config.thankYouAt, 'thank-you');
  if (new Date(config.registrationOpensAt) >= new Date(config.registrationClosesAt)) throw new Error('Registration must close after it opens');
  if (new Date(config.registrationClosesAt) > new Date(config.taskDropsAt)) throw new Error('The task cannot drop before registration closes');
  if (new Date(config.taskDropsAt) >= new Date(config.submissionDeadlineAt)) throw new Error('The submission deadline must be after the task drop');
  return config;
}

export function windowOverrideEnabled(request) {
  if (process.env.VERCEL_ENV === 'production') return false;
  if (process.env.VERCEL_ENV === 'preview') return process.env.ENTANGLE_PREVIEW_TEST_MODE === 'true';
  if (process.env.VERCEL_ENV === 'development') return true;
  const host = String(request?.headers?.host || '').toLowerCase();
  const hostname = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0];
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function eventState(now = new Date()) {
  const config = getEventConfig();
  const time = now.getTime();
  if (time < new Date(config.registrationOpensAt).getTime()) return 'upcoming';
  if (time < new Date(config.registrationClosesAt).getTime()) return 'registration';
  if (time < new Date(config.taskDropsAt).getTime()) return 'awaiting-task';
  if (time < new Date(config.submissionDeadlineAt).getTime()) return 'live';
  return 'closed';
}
