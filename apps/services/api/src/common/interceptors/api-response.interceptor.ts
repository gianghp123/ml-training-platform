import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ApiResponse, PaginatedResponse } from "@training-ml/contracts";
import { Observable, map } from "rxjs";

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | PaginatedResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | PaginatedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'meta' in data) {
          return data as PaginatedResponse<T>;
        }
        return { data } as ApiResponse<T>;
      }),
    );
  }
}
