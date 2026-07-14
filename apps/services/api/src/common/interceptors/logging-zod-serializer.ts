import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { catchError, throwError } from 'rxjs';

@Injectable()
export class LoggingZodSerializerInterceptor extends ZodSerializerInterceptor {
  private readonly logger = new Logger(LoggingZodSerializerInterceptor.name);

  override intercept(
    context: ExecutionContext,
    next: CallHandler,
  ) {
    try {
      const stream = super.intercept(context, next);

      return stream.pipe(
        catchError((err) => {
          console.error("rxjs error", err);
          return throwError(() => err);
        }),
      );
    } catch (err) {
      console.error("sync error", err);
      throw err;
    }
  }
}
