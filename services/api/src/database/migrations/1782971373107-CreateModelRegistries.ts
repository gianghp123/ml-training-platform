import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateModelRegistries1782971373107 implements MigrationInterface {
    name = 'CreateModelRegistries1782971373107'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "model_registries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "artifact_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "version" character varying NOT NULL,
                "description" text,
                "user_id" character varying NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_model_registries" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_model_registries_name_version" UNIQUE ("name", "version"),
                CONSTRAINT "UQ_model_registries_artifact" UNIQUE ("artifact_id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "model_registries" 
            ADD CONSTRAINT "FK_model_registries_artifact" 
            FOREIGN KEY ("artifact_id") REFERENCES "artifacts"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_registries" DROP CONSTRAINT "FK_model_registries_artifact"`);
        await queryRunner.query(`DROP TABLE "model_registries"`);
    }
}
