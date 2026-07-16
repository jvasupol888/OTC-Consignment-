import { Global, Module, type OnModuleDestroy, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { createDb, type Database } from '@otc/db';

export const DATABASE = Symbol('DATABASE');
export const DATABASE_POOL = Symbol('DATABASE_POOL');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => createDb(process.env.DATABASE_URL).pool,
    },
    {
      provide: DATABASE,
      useFactory: () => createDb(process.env.DATABASE_URL).db,
    },
  ],
  exports: [DATABASE, DATABASE_POOL],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}

export type { Database };
