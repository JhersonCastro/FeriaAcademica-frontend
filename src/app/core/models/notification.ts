export interface NotificationDto {
  id: string;
  /** `null` for notifications that do not belong to an event. */
  eventId: string | null;
  type: string;
  /** Text written by the backend (in English); see `describeNotification`. */
  message: string;
  isRead: boolean;
  createdAt: string;
}
