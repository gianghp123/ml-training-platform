import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkers1782971373103 implements MigrationInterface {
    name = 'CreateWorkers1782971373103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "workers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "hostname" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'idle',
                "last_heartbeat" TIMESTAMP WITH TIME ZONE,
                "capability" jsonb,
                CONSTRAINT "PK_workers" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_workers_hostname" UNIQUE ("hostname")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workers"`);
    }
}
