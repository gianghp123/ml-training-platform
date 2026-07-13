'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BlockCategory, BlockDefinition } from '@training-ml/contracts';
import { GripVertical, Group, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS } from '../blocks';
import { Separator } from '@/components/ui/separator';

interface BlockPaletteContextMenuProps {
  position: { x: number; y: number };
  searchQuery: string;
  onSearchChange: (q: string) => void;
  blocksByCategory: Array<{
    category: BlockCategory;
    blocks: BlockDefinition[];
  }>;
  onSelectBlock: (blockId: string) => void;
  onClose: () => void;
  groupableCount?: number;
  onGroupSelection?: () => void;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function BlockPaletteContextMenu({
  position,
  searchQuery,
  onSearchChange,
  blocksByCategory,
  onSelectBlock,
  onClose,
  groupableCount = 0,
  onGroupSelection,
}: BlockPaletteContextMenuProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(position);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      setPos({
        x: clamp(e.clientX - dragOffset.current.x, 0, window.innerWidth - 280),
        y: clamp(e.clientY - dragOffset.current.y, 0, window.innerHeight - 40),
      });
    }

    function handleMouseUp() {
      setDragging(false);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <Card
        ref={cardRef}
        className="fixed z-50 w-72 shadow-lg overflow-hidden flex flex-col"
        style={{ left: pos.x, top: pos.y }}
      >
        <div
          className="flex items-center gap-1.5 p-2 cursor-grab active:cursor-grabbing select-none border-b"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search blocks..."
              className="h-7 pl-7 text-xs"
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <ScrollArea className="h-100">
          <div className="p-1">
            {groupableCount >= 2 && onGroupSelection && (
              <>
                <button
                  onClick={onGroupSelection}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Group className="size-3.5" />
                  Group Selection ({groupableCount})
                </button>
                <Separator className="my-1" />
              </>
            )}
            {blocksByCategory.map((group) => (
              <div key={group.category.id}>
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <div
                    className={`size-2 rounded-full ${CATEGORY_COLORS[group.category.id] ?? 'bg-gray-500'}`}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {group.category.name}
                  </span>
                </div>
                {group.blocks.map((block) => (
                  <button
                    key={block.id}
                    onClick={() => onSelectBlock(block.id)}
                    className="w-full text-left px-4 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="font-medium text-xs">{block.name}</div>
                    {block.description && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {block.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {blocksByCategory.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No blocks found
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </>
  );
}
