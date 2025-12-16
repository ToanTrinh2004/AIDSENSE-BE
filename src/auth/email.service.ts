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
  async sendTeamRegistrationApprovalMail(to: string, teamName: string) {
    await this.transporter.sendMail({
      from: `"AID SENSE" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Team Registration Approved',
      html: `
        <h2>Team Registration Approved</h2>
        <p>Congratulations! Your team "<strong>${teamName}</strong>" has been approved.</p>
        <p>You can now start supporting SOS requests.</p>
      `,
    });
  }
  async sendTeamRegistrationRejectionMail(to: string, teamName: string, reason: string) {
    await this.transporter.sendMail({
      from: `"AID SENSE" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Team Registration Rejected',
      html: `
        <h2>Team Registration Rejected</h2>
        <p>We regret to inform you that your team "<strong>${teamName}</strong>" has been rejected.</p>
        <p>Reason: ${reason}</p>
      `,
    });
  }
  async sendOtpToTeamLeader(to: string, otp: string) {
    await this.transporter.sendMail({
      from: `"AID SENSE" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Team Leader OTP Code',
      html: `
        <h2>Your Team Leader OTP Code</h2>
        <p style="font-size: 22px; font-weight: bold;">${otp}</p>
        <p>This OTP will expire in 5 minutes.</p>
      `,
    });
  }
}
