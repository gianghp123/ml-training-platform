import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlockDefinitions1782971373099 implements MigrationInterface {
    name = 'CreateBlockDefinitions1782971373099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "block_definitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying NOT NULL,
                "name" character varying NOT NULL,
                "category_id" uuid NOT NULL,
                "description" character varying,
                "config_schema" jsonb,
                "input_schema" jsonb,
                "output_schema" jsonb,
                "docker_image" character varying,
                "version" character varying,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_block_definitions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_block_definitions_code" UNIQUE ("code")
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
