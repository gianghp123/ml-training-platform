import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { ClassConstructor } from 'class-transformer';
import { SERIALIZE_KEY } from '../decorators/serialize.decorator';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const dto = this.reflector.get<ClassConstructor<object>>(
      SERIALIZE_KEY,
      context.getHandler(),
    );

    if (!dto) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) =>
        plainToInstance(dto, data, {
          excludeExtraneousValues: true,
        }),
      ),
    );
  }
}
