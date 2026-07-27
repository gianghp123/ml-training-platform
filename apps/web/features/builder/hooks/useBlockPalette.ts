'use client';

import { useState, useMemo, useCallback } from 'react';
import type { BlockDefinition, BlockCategory } from '@training-ml/contracts';

interface UseBlockPaletteProps {
  blocks: BlockDefinition[];
  categories: BlockCategory[];
}

interface UseBlockPaletteReturn {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBlocks: BlockDefinition[];
  blocksByCategory: Array<{ category: BlockCategory; blocks: BlockDefinition[] }>;
  getBlockById: (id: string) => BlockDefinition | undefined;
}

export function useBlockPalette({ blocks, categories }: UseBlockPaletteProps): UseBlockPaletteReturn {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlocks = useMemo(() => {
    const active = blocks.filter((b) => b.status !== "deprecated");
    if (!searchQuery.trim()) return active;
    const q = searchQuery.toLowerCase();
    return active.filter((b) => b.name.toLowerCase().includes(q));
  }, [searchQuery, blocks]);

  const blocksByCategory = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        blocks: filteredBlocks.filter((b) => b.categoryId === cat.id),
      }))
      .filter((g) => g.blocks.length > 0);
  }, [filteredBlocks, categories]);

  const getBlockById = useCallback(
    (id: string): BlockDefinition | undefined => {
      return blocks.find((b) => b.id === id);
    },
    [blocks]
  );

  return { searchQuery, setSearchQuery, filteredBlocks, blocksByCategory, getBlockById };
}
