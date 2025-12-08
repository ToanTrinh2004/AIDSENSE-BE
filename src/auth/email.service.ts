import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendOtpMail(to: string, otp: string) {
    await this.transporter.sendMail({
      from: `"AID SENSE" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Your OTP Code',
      html: `
        <h2>Your OTP Code</h2>
        <p style="font-size: 22px; font-weight: bold;">${otp}</p>
        <p>This OTP will expire in 5 minutes.</p>
      `,
    });
  }
}
