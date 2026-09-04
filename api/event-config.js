import { allowMethods, json } from './_lib/http.js';
import { eventState, getEventConfig, registrationIsOpen } from './_lib/event.js';

export default function handler(request, response) {
  if (!allowMethods(request, response, ['GET'])) return;
  const config = getEventConfig();
  return json(response, 200, {
    registrationOpensAt: config.registrationOpensAt,
    registrationClosesAt: config.registrationClosesAt,
    lateRegistrationClosesAt: config.lateRegistrationClosesAt,
    registrationOpen: registrationIsOpen(),
    taskDropsAt: config.taskDropsAt,
    submissionOpensAt: config.submissionOpensAt,
    submissionDeadlineAt: config.submissionDeadlineAt,
    thankYouAt: config.thankYouAt,
    maxUploadBytes: config.maxUploadBytes,
    state: eventState()
  });
}
