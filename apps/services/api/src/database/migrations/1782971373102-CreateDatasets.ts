import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDatasets1782971373102 implements MigrationInterface {
  name = "CreateDatasets1782971373102";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "datasets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "storage_uri" character varying NOT NULL,
        "format" character varying NOT NULL,
        "size" bigint NOT NULL,
        "checksum" character varying,
        "version" integer NOT NULL DEFAULT 1,
        "user_id" character varying NOT NULL,

        "status" character varying NOT NULL DEFAULT 'UPLOADING',
        "profile" jsonb,
        "validation_error" text,
        "validation_options" jsonb,

        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_datasets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dataset_user_name_version"
          UNIQUE ("user_id", "name", "version")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "datasets"`);
  }
}
