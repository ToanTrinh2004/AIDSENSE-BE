export interface BilingualMessage {
  vi: string;
  en: string;
}

export function pickMessage(msg: BilingualMessage, lang?: string): string {
  return lang?.toLowerCase() === 'en' ? msg.en : msg.vi;
}

export function isBilingualMessage(value: any): value is BilingualMessage {
  return value && typeof value === 'object' && ('vi' in value || 'en' in value);
}

export const Messages = {
  otpSentSignup: { vi: 'OTP đã được gửi đến số điện thoại. Vui lòng xác thực để hoàn tất đăng ký.', en: 'OTP has been sent to your phone. Please verify to complete registration.' },
  otpSent: { vi: 'OTP đã được gửi đến số điện thoại.', en: 'OTP has been sent to your phone.' },
  phoneAlreadyRegistered: { vi: 'Số điện thoại đã được đăng ký.', en: 'This phone number is already registered.' },
  cannotCheckUser: { vi: 'Không thể kiểm tra người dùng.', en: 'Unable to check user.' },
  signupRequestExpired: { vi: 'Yêu cầu đăng ký đã hết hạn. Vui lòng đăng ký lại.', en: 'Signup request has expired. Please register again.' },
  signupNotFound: { vi: 'Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.', en: 'No pending signup request found. Please register again.' },
  cannotCreateAccount: { vi: 'Không thể tạo tài khoản', en: 'Unable to create account' },
  cannotCreateProfile: { vi: 'Không thể tạo hồ sơ người dùng', en: 'Unable to create user profile' },
  signupSuccess: { vi: 'Đăng ký tài khoản thành công.', en: 'Account registered successfully.' },
  phoneNotRegistered: { vi: 'Số điện thoại chưa được đăng ký.', en: 'This phone number is not registered.' },
  invalidOtpType: { vi: 'Loại OTP không hợp lệ.', en: 'Invalid OTP type.' },
  otpVerifiedSetNewPassword: { vi: 'Xác thực OTP thành công. Vui lòng đặt mật khẩu mới.', en: 'OTP verified successfully. Please set a new password.' },
  invalidCredentials: { vi: 'Thông tin đăng nhập không hợp lệ.', en: 'Invalid login credentials.' },
  cannotFetchUserData: { vi: 'Không thể lấy dữ liệu người dùng', en: 'Unable to fetch user data' },
  loginSuccess: { vi: 'Đăng nhập thành công.', en: 'Login successful.' },
  passwordMismatch: { vi: 'Mật khẩu không khớp.', en: 'Passwords do not match.' },
  otpNotVerified: { vi: 'Vui lòng xác thực OTP trước khi đặt lại mật khẩu.', en: 'Please verify OTP before resetting your password.' },
  userNotFound: { vi: 'Không tìm thấy người dùng.', en: 'User not found.' },
  cannotUpdatePassword: { vi: 'Không thể cập nhật mật khẩu.', en: 'Unable to update password.' },
  passwordUpdateSuccess: { vi: 'Cập nhật mật khẩu thành công.', en: 'Password updated successfully.' },
  cannotSendOtp: { vi: 'Không thể gửi OTP.', en: 'Unable to send OTP.' },
  otpVerifySuccess: { vi: 'Xác thực OTP thành công.', en: 'OTP verified successfully.' },
  cannotVerifyOtp: { vi: 'Không thể xác thực OTP.', en: 'Unable to verify OTP.' },
  otpExpired: { vi: 'OTP đã hết hạn hoặc chưa được gửi.', en: 'OTP has expired or was never sent.' },
  otpInvalid: { vi: 'OTP không hợp lệ.', en: 'Invalid OTP.' },
  logoutSuccess: { vi: 'Đăng xuất thành công.', en: 'Logged out successfully.' },
  provinceNotSet: { vi: 'Bạn chưa cập nhật tỉnh/thành phố', en: 'Your province is not set', },
  cannotFetchUserProvince: { vi: 'Không thể lấy thông tin tỉnh/thành phố của bạn', en: 'Could not retrieve your province information', },
  cannotFetchSameProvinceUsers: { vi: 'Không thể lấy danh sách người dùng cùng tỉnh/thành phố', en: 'Could not retrieve users in the same province', },
  alreadyInTeam: {
    vi: 'Bạn đã thuộc một đội, không thể gửi yêu cầu tham gia đội khác',
    en: 'You are already in a team and cannot join another',
  },
  teamNotFound: {
    vi: 'Không tìm thấy đội',
    en: 'Team not found',
  },
  joinRequestAlreadyPending: {
    vi: 'Bạn đã có yêu cầu đang chờ duyệt cho đội này',
    en: 'You already have a pending request for this team',
  },
  joinRequestSent: {
    vi: 'Đã gửi yêu cầu tham gia đội',
    en: 'Join request sent',
  },
  notTeamLeader: {
    vi: 'Bạn không phải là trưởng đội này',
    en: 'You are not the leader of this team',
  },
  joinRequestNotFound: {
    vi: 'Không tìm thấy yêu cầu tham gia đội',
    en: 'Join request not found',
  },
  joinRequestAlreadyResponded: {
    vi: 'Yêu cầu này đã được xử lý',
    en: 'This request has already been responded to',
  },
  joinRequestAccepted: {
    vi: 'Đã chấp nhận yêu cầu tham gia đội',
    en: 'Join request accepted',
  },
  joinRequestRejected: {
    vi: 'Đã từ chối yêu cầu tham gia đội',
    en: 'Join request rejected',
  },
};
