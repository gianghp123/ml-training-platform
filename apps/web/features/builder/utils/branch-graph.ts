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
  maxChars = 100
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
  outgoing: Map<string, string[]>,
  orderIndexMap: Map<string, number>
): Array<{ rootId: string; exclusiveIds: string[] }> {
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

  const branches: Array<{ rootId: string; exclusiveIds: string[] }> = []
  for (const root of roots) {
    const own = reachable.get(root) ?? new Set<string>()
    const otherRoots = roots.filter((other) => other !== root)
    const exclusiveIds = [...own]
      .filter(
        (node) =>
          !otherRoots.some((other) => reachable.get(other)?.has(node))
      )
      .sort(
        (a, b) =>
          (orderIndexMap.get(a) ?? 0) - (orderIndexMap.get(b) ?? 0)
      )
    if (exclusiveIds.length > 0) {
      branches.push({ rootId: root, exclusiveIds })
    }
  }

  if (
    branches.length > 0 &&
    branches.every((branch) => (outgoing.get(branch.rootId)?.length ?? 0) === 0)
  ) {
    return []
  }
  return branches
}

interface LeafBranch {
  splitId: string
  rootId: string
  exclusiveIds: string[]
  nodeIds: string[]
}

function collectLeafBranches(
  nodeIds: string[],
  outgoing: Map<string, string[]>,
  order: string[],
  orderIndexMap: Map<string, number>
): LeafBranch[] {
  const candidates = order.filter(
    (nodeId) =>
      nodeIds.includes(nodeId) && (outgoing.get(nodeId)?.length ?? 0) >= 2
  )
  let splitId: string | undefined
  let branches: Array<{ rootId: string; exclusiveIds: string[] }> = []
  for (const candidate of candidates) {
    branches = detectBranchesFromSplit(candidate, outgoing, orderIndexMap)
    if (branches.length > 0) {
      splitId = candidate
      break
    }
  }
  if (!splitId) return []

  const prefix = [
    ...nodeIds.filter(
      (nodeId) => !reachableFrom(splitId, outgoing).has(nodeId)
    ),
    splitId,
  ]

  const leaves: LeafBranch[] = []
  for (const branch of branches) {
    const subLeaves = collectLeafBranches(
      branch.exclusiveIds,
      outgoing,
      order,
      orderIndexMap
    )
    if (subLeaves.length > 0) {
      for (const leaf of subLeaves) {
        leaves.push({
          ...leaf,
          nodeIds: [...prefix, ...leaf.nodeIds],
        })
      }
    } else {
      leaves.push({
        splitId,
        rootId: branch.rootId,
        exclusiveIds: branch.exclusiveIds,
        nodeIds: [...prefix, ...branch.exclusiveIds],
      })
    }
  }
  return leaves
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
  const orderIndexMap = new Map(order.map((id, index) => [id, index]))
  const leaves = collectLeafBranches(nodeIds, outgoing, order, orderIndexMap)
  if (leaves.length === 0) {
    return [
      {
        id: "__all__",
        label: "Pipeline",
        nodeIds,
        orderedExclusiveIds: nodeIds,
      },
    ]
  }

  const commonPrefix = commonPathPrefix(
    leaves.map((leaf) =>
      leaf.exclusiveIds.map((id) => nodeLabels[id] ?? id)
    )
  )

  return leaves.map((leaf, index) => {
    const exclusiveIds = leaf.exclusiveIds.slice(commonPrefix)
    return {
      id: `${leaf.splitId}:${leaf.rootId}`,
      label: formatPathLabel(exclusiveIds, nodeLabels, index),
      nodeIds: [...leaf.nodeIds].sort(),
      orderedExclusiveIds: leaf.exclusiveIds,
    }
  })
}

function commonPathPrefix(paths: string[][]): number {
  if (paths.length === 0) return 0
  const minLength = Math.min(...paths.map((path) => path.length))
  let prefix = 0
  outer: while (prefix < minLength) {
    const head = paths[0][prefix]
    for (const path of paths) {
      if (path[prefix] !== head) break outer
    }
    prefix += 1
  }
  return prefix
}
