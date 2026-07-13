import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNodeExecutions1782971373105 implements MigrationInterface {
    name = 'CreateNodeExecutions1782971373105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "node_executions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workflow_run_id" uuid NOT NULL,
                "node_id" character varying NOT NULL,
                "node_type" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "worker_id" uuid,
                "retry_count" integer NOT NULL DEFAULT '0',
                "started_at" TIMESTAMP WITH TIME ZONE,
                "finished_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_node_executions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_node_executions_run_node" UNIQUE ("workflow_run_id", "node_id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "node_executions" 
            ADD CONSTRAINT "FK_node_executions_workflow_run" 
            FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "node_executions" 
            ADD CONSTRAINT "FK_node_executions_worker" 
            FOREIGN KEY ("worker_id") REFERENCES "workers"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "node_executions" DROP CONSTRAINT "FK_node_executions_worker"`);
        await queryRunner.query(`ALTER TABLE "node_executions" DROP CONSTRAINT "FK_node_executions_workflow_run"`);
        await queryRunner.query(`DROP TABLE "node_executions"`);
    }
}
