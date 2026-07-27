import type { BlockDefinition, Contract } from '@training-ml/contracts';
import { validatePorts } from '../../src/phases/validate-ports';
import type { GraphEdge, NodeContext } from '../../src/types';

const datasetContract = {
  artifact: 'Dataset',
  schema: { columns: [], target: null },
  role: 'full',
  task: null,
} as unknown as Contract;

const featureUnionDef = {
  ports: {
    inputs: [
      { id: 'datasetA', artifact: 'Dataset' },
      { id: 'datasetB', artifact: 'Dataset' },
      { id: 'datasetC', artifact: 'Dataset', optional: true },
      { id: 'datasetD', artifact: 'Dataset', optional: true },
    ],
    outputs: [{ id: 'dataset', artifact: 'Dataset' }],
  },
} as unknown as BlockDefinition;

function ctxWith(inputContracts: Record<string, Contract>): NodeContext {
  return {
    node: { id: 'n1', blockId: 'b', blockVersion: 1, config: {} },
    definition: featureUnionDef,
    inputContracts,
    outputContracts: {},
    errors: [],
  } as NodeContext;
}

const edgeTo = (port: string): GraphEdge => ({
  id: `e-${port}`,
  sourceNodeId: 'src',
  sourcePortId: 'dataset',
  targetNodeId: 'n1',
  targetPortId: port,
});

describe('validatePorts: optional inputs', () => {
  it('errors on unconnected required inputs', () => {
    const errors = validatePorts(ctxWith({}), []);
    expect(errors.filter((e) => e.code === 'PORT_NOT_CONNECTED').map((e) => e.fieldId)).toEqual([
      'datasetA',
      'datasetB',
    ]);
  });

  it('does not error on unconnected optional inputs', () => {
    const errors = validatePorts(ctxWith({ datasetA: datasetContract, datasetB: datasetContract }), [
      edgeTo('datasetA'),
      edgeTo('datasetB'),
    ]);
    expect(errors).toEqual([]);
  });

  it('still validates artifact type on connected optional inputs', () => {
    const modelContract = { ...datasetContract, artifact: 'Model' } as Contract;
    const errors = validatePorts(
      ctxWith({ datasetA: datasetContract, datasetB: datasetContract, datasetC: modelContract }),
      [edgeTo('datasetA'), edgeTo('datasetB'), edgeTo('datasetC')],
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('ARTIFACT_MISMATCH');
    expect(errors[0].fieldId).toBe('datasetC');
  });

  it('still rejects double-connected optional inputs', () => {
    const errors = validatePorts(
      ctxWith({ datasetA: datasetContract, datasetB: datasetContract, datasetC: datasetContract }),
      [edgeTo('datasetA'), edgeTo('datasetB'), edgeTo('datasetC'), edgeTo('datasetC')],
    );
    expect(errors.some((e) => e.code === 'PORT_ALREADY_CONNECTED' && e.fieldId === 'datasetC')).toBe(true);
  });
});
