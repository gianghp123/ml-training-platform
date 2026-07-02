'use client';

import { useState, useMemo, useCallback } from 'react';
import type { BlockDefinition, BlockCategory } from '@/lib/models';
import { ALL_BLOCKS, BLOCK_CATEGORIES } from '../blocks';

interface UseBlockPaletteReturn {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBlocks: BlockDefinition[];
  blocksByCategory: Array<{ category: BlockCategory; blocks: BlockDefinition[] }>;
  getBlockById: (id: string) => BlockDefinition | undefined;
}

export function useBlockPalette(): UseBlockPaletteReturn {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return ALL_BLOCKS;
    const q = searchQuery.toLowerCase();
    return ALL_BLOCKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const blocksByCategory = useMemo(() => {
    return BLOCK_CATEGORIES.map((cat) => ({
      category: cat,
      blocks: filteredBlocks.filter((b) => b.categoryId === cat.id),
    })).filter((g) => g.blocks.length > 0);
  }, [filteredBlocks]);

  const getBlockById = useCallback((id: string): BlockDefinition | undefined => {
    return ALL_BLOCKS.find((b) => b.id === id);
  }, []);

  return { searchQuery, setSearchQuery, filteredBlocks, blocksByCategory, getBlockById };
}
