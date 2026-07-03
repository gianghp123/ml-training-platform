"use client"

import { DatabaseIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import React, { useCallback } from "react"

import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const PAGE_SIZES = [10, 20, 50, 100] as const

export interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  totalItems: number
  pageSizeOptions?: readonly number[]
  defaultPageSize?: number
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  totalItems,
  pageSizeOptions = PAGE_SIZES,
  defaultPageSize = 10,
  isLoading = false,
  emptyTitle = "No results",
  emptyDescription = "No data to display at this time.",
  className,
}: DataTableProps<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("pageSize")) || defaultPageSize
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      return params.toString()
    },
    [searchParams],
  )

  const pageUrl = useCallback(
    (p: number) => {
      const qs = createQueryString({ page: p === 1 ? null : String(p) })
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, createQueryString],
  )

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      router.push(`${pathname}?${createQueryString(updates)}`, { scroll: false })
    },
    [router, pathname, createQueryString],
  )

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  function getPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // Near the beginning
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "ellipsis", totalPages);
      return pages;
    }
    // Near the end
    if (page >= totalPages - 3) {
      pages.push(
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
      return pages;
    }
    // Middle
    pages.push(
      1,
      "ellipsis",
      page - 1,
      page,
      page + 1,
      "ellipsis",
      totalPages
    );
    return pages;
  }

  function renderTable() {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.header}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (data.length === 0) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Empty className="py-16">
                  <EmptyMedia variant="icon">
                    <DatabaseIcon />
                  </EmptyMedia>
                  <EmptyTitle>{emptyTitle}</EmptyTitle>
                  <EmptyDescription>{emptyDescription}</EmptyDescription>
                </Empty>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.header} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.header} className={col.className}>
                  {col.cell
                    ? col.cell(row)
                    : col.accessorKey
                      ? String(row[col.accessorKey] ?? "")
                      : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border", className)}>
      {renderTable()}
      <div className="flex items-center justify-between gap-4 border-t px-4 py-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {from}-{to} of {totalItems}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              navigate({
                pageSize: v === String(defaultPageSize) ? null : v,
                page: null,
              })
            }
          >
            <SelectTrigger size="sm" className="h-7 w-17">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={page > 1 ? pageUrl(page - 1) : "#"}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {getPageNumbers().map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href={pageUrl(p)}
                    isActive={page === p}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href={page < totalPages ? pageUrl(page + 1) : "#"}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
