import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { pickMessage, isBilingualMessage } from '../utils/messages';

@Injectable()
export class LangInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const lang = request.headers['x-localization'] ?? 'vi';

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && isBilingualMessage(data.message)) {
          return { ...data, message: pickMessage(data.message, lang) };
        }
        return data;
      }),
    );
  }
}