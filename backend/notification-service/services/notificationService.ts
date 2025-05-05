import transporter from '../config/mailer';
import NotificationModel, { INotification } from '../models/notification';
import { buildEmailTemplate } from '../utils/templateBuilder';

export default class NotificationService {
  async sendEmail(to: string, subject: string, message: string): Promise<INotification> {
    const html = buildEmailTemplate(subject, message);
    const notif = new NotificationModel({ type: 'email', to, subject, body: html });
    await notif.save();
    try {
      await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
      notif.status = 'sent';
    } catch (err: any) {
      notif.status = 'failed';
      notif.error = err.message;
    }
    await notif.save();
    return notif;
  }
}