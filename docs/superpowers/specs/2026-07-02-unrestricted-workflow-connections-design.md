# Unrestricted Workflow Connections

## Goal

Allow a workflow edge to connect any source block to any target block. Users may finish the connection either on a target handle or anywhere on the target block body.

## Interaction design

- Dragging from an output handle to any target handle creates an edge.
- Dragging from an output handle and releasing over a block body creates an edge to that block.
- A body drop resolves to the block's existing target handle when one exists. If a block has no target handle, the block receives a generic target handle so it can accept connections.
- Connection type restrictions are removed. Self-connections are allowed because the requirement states that any block may connect to any block.
- Connection creation remains disabled while the pipeline is running.
- Existing edges, handle-specific connections, node dragging, and edge deletion continue to work.

## Implementation boundaries

- Keep React Flow as the graph engine.
- Remove semantic connection validation from `PipelineStudioScreen`.
- Add a node-body drop target that converts a pending connection into a normal React Flow edge using the target block's default input handle.
- Store body-drop edges using the same `source`, `target`, `sourceHandle`, and `targetHandle` structure already used by handle-to-handle edges.
- Do not change pipeline execution semantics in this change.

## Verification

- A previously rejected cross-type handle connection succeeds.
- Releasing a connection on a block body creates an edge.
- Releasing on a circular target handle still creates an edge.
- Connection attempts remain disabled while a pipeline is running.
- Type checking, linting, and the relevant automated tests pass.
