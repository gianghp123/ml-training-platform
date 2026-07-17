import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({
  path: '.env',
});

const config = {
  host: `${process.env.REDIS_HOST}`,
  port: `${process.env.REDIS_PORT}`,
  password: `${process.env.REDIS_PASSWORD}`,
};

export default registerAs('redis', () => config);
