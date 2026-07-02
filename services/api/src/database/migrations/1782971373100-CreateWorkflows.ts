import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflows1782971373100 implements MigrationInterface {
    name = 'CreateWorkflows1782971373100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "workflows" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_workflows" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_workflows_user_name" UNIQUE ("user_id", "name")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "workflows"`);
    }
}
