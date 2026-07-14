import { MigrationInterface, QueryRunner } from "typeorm";

export class RedesignBlockTables1783578050891 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // block_categories changes
        await queryRunner.query(`ALTER TABLE "block_categories" ADD "code" character varying`);
        await queryRunner.query(`UPDATE "block_categories" SET "code" = "id"::text WHERE "code" IS NULL`);
        await queryRunner.query(`ALTER TABLE "block_categories" ALTER COLUMN "code" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "block_categories" ADD CONSTRAINT "UQ_block_categories_code" UNIQUE ("code")`);
        
        await queryRunner.query(`ALTER TABLE "block_categories" ADD "order_index" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "block_categories" ADD "description" text`);

        // block_definitions changes
        await queryRunner.query(`ALTER TABLE "block_definitions" ADD "port_schema" jsonb`);
        await queryRunner.query(`ALTER TABLE "block_definitions" ADD "runtime_info" jsonb`);
        await queryRunner.query(`ALTER TABLE "block_definitions" DROP COLUMN "input_schema"`);
        await queryRunner.query(`ALTER TABLE "block_definitions" DROP COLUMN "output_schema"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // block_definitions changes
        await queryRunner.query(`ALTER TABLE "block_definitions" ADD "output_schema" jsonb`);
        await queryRunner.query(`ALTER TABLE "block_definitions" ADD "input_schema" jsonb`);
        await queryRunner.query(`ALTER TABLE "block_definitions" DROP COLUMN "runtime_info"`);
        await queryRunner.query(`ALTER TABLE "block_definitions" DROP COLUMN "port_schema"`);

        // block_categories changes
        await queryRunner.query(`ALTER TABLE "block_categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "block_categories" DROP COLUMN "order_index"`);
        
        await queryRunner.query(`ALTER TABLE "block_categories" DROP CONSTRAINT "UQ_block_categories_code"`);
        await queryRunner.query(`ALTER TABLE "block_categories" DROP COLUMN "code"`);
    }

}
