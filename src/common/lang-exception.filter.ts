// common/lang-exception.filter.ts  (áp dụng cho response LỖI)
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { pickMessage, isBilingualMessage } from '../utils/messages';

@Catch(HttpException)
export class LangExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const lang = request.headers['x-localization'] ?? 'vi';
    const status = exception.getStatus();

    const exceptionResponse: any = exception.getResponse();
    const rawMessage = exceptionResponse?.message ?? exceptionResponse;

    const message = isBilingualMessage(rawMessage) ? pickMessage(rawMessage, lang) : rawMessage;

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
    });
  }
}