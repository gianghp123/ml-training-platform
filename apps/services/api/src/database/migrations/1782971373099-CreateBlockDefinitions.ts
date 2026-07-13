import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlockDefinitions1782971373099 implements MigrationInterface {
    name = 'CreateBlockDefinitions1782971373099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "block_definitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "version" integer NOT NULL DEFAULT 1,
                "status" character varying NOT NULL DEFAULT 'active',
                "name" character varying NOT NULL,
                "category_id" uuid NOT NULL,
                "ports" jsonb NOT NULL DEFAULT '{}',
                "config_schema" jsonb NOT NULL DEFAULT '{}',
                "constraints" jsonb NOT NULL DEFAULT '{}',
                "output_transform" jsonb NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_block_definitions" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "block_definitions"
            ADD CONSTRAINT "FK_block_definitions_category"
            FOREIGN KEY ("category_id") REFERENCES "block_categories"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "block_definitions" DROP CONSTRAINT "FK_block_definitions_category"`);
        await queryRunner.query(`DROP TABLE "block_definitions"`);
    }
}
