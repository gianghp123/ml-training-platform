import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowVersions1782971373101 implements MigrationInterface {
    name = 'CreateWorkflowVersions1782971373101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "workflow_versions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workflow_id" uuid NOT NULL,
                "version" integer NOT NULL,
                "graph_json" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_workflow_versions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_workflow_versions_workflow_version" UNIQUE ("workflow_id", "version")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_versions" 
            ADD CONSTRAINT "FK_workflow_versions_workflow" 
            FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_versions" DROP CONSTRAINT "FK_workflow_versions_workflow"`);
        await queryRunner.query(`DROP TABLE "workflow_versions"`);
    }
}
