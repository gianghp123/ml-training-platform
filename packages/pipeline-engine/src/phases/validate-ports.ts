import { PipelineArtifactType, type ValidationError } from '@training-ml/contracts';
import type { GraphEdge, NodeContext } from '../types.js';

export function validatePorts(ctx: NodeContext, allEdges: GraphEdge[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const incoming = allEdges.filter((e) => e.targetNodeId === ctx.node.id);
  const inputPorts = ctx.definition.ports.inputs;

  for (const port of inputPorts) {
    const edgesToPort = incoming.filter((e) => e.targetPortId === port.id);
    if (edgesToPort.length === 0) {
      if (port.optional) {
        continue;
      }
      errors.push({
        nodeId: ctx.node.id,
        scope: 'port',
        fieldId: port.id,
        code: 'PORT_NOT_CONNECTED',
        severity: 'error',
        message: `Input port "${port.id}" is not connected.`,
        context: { portId: port.id },
      });
      continue;
    }
    if (edgesToPort.length > 1) {
      errors.push({
        nodeId: ctx.node.id,
        scope: 'port',
        fieldId: port.id,
        code: 'PORT_ALREADY_CONNECTED',
        severity: 'error',
        message: `Input port "${port.id}" accepts only one edge.`,
        context: { portId: port.id, edgeCount: edgesToPort.length },
      });
    }

    const sourceContract = ctx.inputContracts[port.id];
    if (sourceContract && sourceContract.artifact !== port.artifact) {
      errors.push({
        nodeId: ctx.node.id,
        scope: 'port',
        fieldId: port.id,
        code: 'ARTIFACT_MISMATCH',
        severity: 'error',
        message: `Expected ${port.artifact}, received ${sourceContract.artifact}.`,
        context: { expected: port.artifact, actual: sourceContract.artifact },
      });
    }
  }

  return errors;
}
