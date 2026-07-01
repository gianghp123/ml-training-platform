import { SetMetadata } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';

export const SERIALIZE_KEY = 'serialize_key';

export const Serialize = <T>(dto: ClassConstructor<T>) =>
  SetMetadata(SERIALIZE_KEY, dto);
