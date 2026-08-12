export interface BranchGraphNode {
  id: string
}

export interface BranchGraphEdge {
  source: string
  target: string
}

export interface Branch {
  id: string
  label: string
  nodeIds: string[]
  orderedExclusiveIds: string[]
}

function adjacency(edges: BranchGraphEdge[]): Map<string, string[]> {
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    const list = outgoing.get(edge.source)
    if (list) {
      list.push(edge.target)
    } else {
      outgoing.set(edge.source, [edge.target])
    }
  }
  return outgoing
}

function reachableFrom(
  start: string,
  outgoing: Map<string, string[]>
): Set<string> {
  const visited = new Set<string>([start])
  const queue = [start]
  while (queue.length > 0) {
    const current = queue.pop()
    if (current === undefined) break
    for (const next of outgoing.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }
  return visited
}

function topologicalOrder(
  nodeIds: string[],
  outgoing: Map<string, string[]>
): string[] {
  const inDegree = new Map(nodeIds.map((id) => [id, 0]))
  for (const targets of outgoing.values()) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1)
    }
  }

  const queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0)
  const order: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    order.push(current)
    for (const next of outgoing.get(current) ?? []) {
      const nextDegree = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, nextDegree)
      if (nextDegree === 0) queue.push(next)
    }
  }

  if (order.length < nodeIds.length) {
    for (const id of nodeIds) {
      if (!order.includes(id)) order.push(id)
    }
  }
  return order
}

function formatPathLabel(
  orderedIds: string[],
  nodeLabels: Record<string, string>,
  index: number,
  maxChars = 60
): string {
  const names = orderedIds
    .map((id) => nodeLabels[id])
    .filter((name): name is string => Boolean(name))
  if (names.length === 0) return `Graph ${index + 1}`
  const label = names.join(" → ")
  return label.length > maxChars
    ? `${label.slice(0, maxChars - 1)}…`
    : label
}

function detectBranchesFromSplit(
  splitId: string,
  nodeIds: string[],
  outgoing: Map<string, string[]>,
  order: string[]
): Array<{ rootId: string; nodeIds: string[]; orderedExclusiveIds: string[] }> {
  const successors = [...new Set(outgoing.get(splitId) ?? [])]
  const reachable = new Map(
    successors.map((successor) => [
      successor,
      reachableFrom(successor, outgoing),
    ])
  )
  const roots = successors.filter(
    (successor) =>
      !successors.some(
        (other) => other !== successor && reachable.get(other)?.has(successor)
      )
  )
  if (roots.length < 2) return []

  const prefix = new Set(
    nodeIds.filter(
      (nodeId) => !reachableFrom(splitId, outgoing).has(nodeId)
    )
  )
  prefix.add(splitId)

  const branches: Array<{
    rootId: string
    nodeIds: string[]
    orderedExclusiveIds: string[]
  }> = []
  for (const root of roots) {
    const own = reachable.get(root) ?? new Set<string>()
    const otherRoots = roots.filter((other) => other !== root)
    const exclusive = new Set(
      [...own].filter(
        (node) =>
          !otherRoots.some((other) => reachable.get(other)?.has(node))
      )
    )
    if (exclusive.size === 0) continue

    const branchNodes = new Set(prefix)
    for (const node of exclusive) branchNodes.add(node)
    const orderedExclusiveIds = order.filter((id) => exclusive.has(id))
    branches.push({
      rootId: root,
      nodeIds: [...branchNodes].sort(),
      orderedExclusiveIds,
    })
  }
  return branches
}

export function detectBranches(
  nodes: BranchGraphNode[],
  edges: BranchGraphEdge[] = [],
  nodeLabels: Record<string, string> = {}
): Branch[] {
  const nodeIds = nodes.map((node) => node.id)
  if (nodeIds.length === 0) return []
  const outgoing = adjacency(edges)

  const order = topologicalOrder(nodeIds, outgoing)
  const splitId = order.find(
    (nodeId) => (outgoing.get(nodeId)?.length ?? 0) >= 2
  )
  if (!splitId) {
    return [
      {
        id: "__all__",
        label: "Pipeline",
        nodeIds,
        orderedExclusiveIds: nodeIds,
      },
    ]
  }

  const branches: Branch[] = []
  detectBranchesFromSplit(splitId, nodeIds, outgoing, order).forEach(
    ({ rootId, nodeIds: branchNodeIds, orderedExclusiveIds }, index) => {
      branches.push({
        id: `${splitId}:${rootId}`,
        label: formatPathLabel(orderedExclusiveIds, nodeLabels, index),
        nodeIds: branchNodeIds,
        orderedExclusiveIds,
      })
    }
  )

  return branches
}
