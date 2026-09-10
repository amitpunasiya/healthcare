import Notification from '../models/Notification';
import mongoose from 'mongoose';

export const createNotification = async (
  userId: string | mongoose.Types.ObjectId,
  title: string,
  message: string,
  type: string,
  bookingId?: string | mongoose.Types.ObjectId
) => {
  try {
    const notif = await Notification.create({
      userId,
      title,
      message,
      type,
      bookingId,
      read: false,
    });
    console.log(`[Notification] Created for User ${userId}: ${title}`);
    return notif;
  } catch (error) {
    console.error('[Notification Error]: Failed to create notification:', error);
  }
};
