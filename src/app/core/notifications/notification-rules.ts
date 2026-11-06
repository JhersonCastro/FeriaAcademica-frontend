import { NotificationDto } from '../models/notification';

export interface NotificationView {
  title: string;
  text: string;
}

/** Type the backend gives to the notice a participant gets when a reviewer decides on a work. */
export const WORK_REVIEWED = 'WorkReviewed';

const WORK_REVIEWED_MESSAGE = /^Your work "(.+)" was (approved with changes|approved|rejected)\b/s;

/** `text` finishes the sentence that starts with the work title. */
const WORK_OUTCOMES: Record<string, NotificationView> = {
  approved: { title: 'Tu trabajo fue aprobado', text: 'fue aprobado.' },
  'approved with changes': {
    title: 'Tu trabajo fue aprobado con cambios',
    text: 'fue aprobado con cambios: aplica la retroalimentación y envíalo de nuevo.',
  },
  rejected: { title: 'Tu trabajo fue rechazado', text: 'fue rechazado.' },
};

/**
 * Spanish title and text for a notification. The backend writes the message in English, so the
 * known ones are translated; anything else is shown as received.
 */
export function describeNotification(notification: NotificationDto): NotificationView {
  if (notification.type === WORK_REVIEWED) {
    const match = WORK_REVIEWED_MESSAGE.exec(notification.message);
    const outcome = match ? WORK_OUTCOMES[match[2]] : undefined;
    if (match && outcome) {
      return { title: outcome.title, text: `Tu trabajo "${match[1]}" ${outcome.text}` };
    }
  }
  return { title: 'Notificación', text: notification.message };
}

/** Route a notification leads to, if it has a natural destination. */
export function notificationLink(notification: NotificationDto): string[] | null {
  return notification.type === WORK_REVIEWED ? ['/works'] : null;
}
