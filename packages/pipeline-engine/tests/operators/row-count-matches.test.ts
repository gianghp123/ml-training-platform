import { rowCountMatches } from '../../src/operators/row-count-matches';
import type { NodeContext } from '../../src/types';

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: {} },
  inputContracts: {},
  definition: {},
  outputContracts: {},
  errors: [],
} as unknown as NodeContext;

describe('rowCountMatches', () => {
  it('skips targets that do not resolve (unconnected optional inputs)', () => {
    expect(
      rowCountMatches(
        { op: 'rowCountMatches', targets: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC'] } as never,
        ctx,
      ),
    ).toEqual([]);
  });
});
