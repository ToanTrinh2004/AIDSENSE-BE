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
      subject: 'Xác nhận thành lập Đội Cứu Hộ - Mã OTP',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #1a73e8;">Xác nhận thành lập đội cứu hộ</h2>
  
          <p>Xin chào,</p>
  
          <p>
            Đây là thư xác nhận việc <strong>thành lập đội cứu hộ</strong> của bạn trên hệ thống 
            <strong>AID SENSE</strong>.
          </p>
  
          <p>
            Để hoàn tất quá trình xác minh và kích hoạt vai trò 
            <strong>Trưởng nhóm cứu hộ</strong>, vui lòng sử dụng mã OTP dưới đây:
          </p>
  
          <p style="
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #d93025;
            margin: 16px 0;
          ">
            ${otp}
          </p>
  
          <p>
            Mã OTP này có hiệu lực trong <strong>5 phút</strong>. 
            Vui lòng không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn tài khoản.
          </p>
  
          <p>
            Nếu bạn không thực hiện yêu cầu thành lập đội cứu hộ, 
            vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.
          </p>
  
          <hr style="margin: 24px 0;" />
  
          <p>
            Chào mừng bạn đến với <strong>AID SENSE</strong> –  
            nền tảng hỗ trợ kết nối và điều phối cứu hộ nhanh chóng, chính xác và hiệu quả.
          </p>
  
          <p>Trân trọng,<br/>
          <strong>Đội ngũ AID SENSE</strong></p>
        </div>
      `,
    });
  }
  
}
