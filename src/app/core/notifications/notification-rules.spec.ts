import { NotificationDto } from '../models/notification';
import { describeNotification, notificationLink } from './notification-rules';

function reviewed(message: string): NotificationDto {
  return {
    id: '1',
    eventId: 'e1',
    type: 'WorkReviewed',
    message,
    isRead: false,
    createdAt: '2026-10-09T15:20:00Z',
  };
}

describe('notification rules (HU-022)', () => {
  it('translates an approved work', () => {
    expect(describeNotification(reviewed('Your work "Riego inteligente" was approved.'))).toEqual({
      title: 'Tu trabajo fue aprobado',
      text: 'Tu trabajo "Riego inteligente" fue aprobado.',
    });
  });

  it('translates an approval with changes', () => {
    const view = describeNotification(
      reviewed(
        'Your work "Riego" was approved with changes: apply the feedback and submit it again.',
      ),
    );
    expect(view.title).toBe('Tu trabajo fue aprobado con cambios');
    expect(view.text).toContain('aplica la retroalimentación');
  });

  it('translates a rejection', () => {
    expect(describeNotification(reviewed('Your work "Riego" was rejected.')).title).toBe(
      'Tu trabajo fue rechazado',
    );
  });

  it('keeps quotes that belong to the work title', () => {
    const view = describeNotification(reviewed('Your work "El "mejor" riego" was approved.'));
    expect(view.text).toBe('Tu trabajo "El "mejor" riego" fue aprobado.');
  });

  it('shows unknown notifications as received', () => {
    const unknown: NotificationDto = { ...reviewed('Something happened.'), type: 'Other' };
    expect(describeNotification(unknown)).toEqual({
      title: 'Notificación',
      text: 'Something happened.',
    });
  });

  it('links a reviewed work to the works list', () => {
    expect(notificationLink(reviewed('Your work "A" was approved.'))).toEqual(['/works']);
    expect(notificationLink({ ...reviewed('x'), type: 'Other' })).toBeNull();
  });
});
