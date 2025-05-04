"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = []

        // Always show first page
        pages.push(1)

        // Calculate range around current page
        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)

        // Add ellipsis after first page if needed
        if (start > 2) {
            pages.push("...")
        }

        // Add pages in range
        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        // Add ellipsis before last page if needed
        if (end < totalPages - 1) {
            pages.push("...")
        }

        // Always show last page if there's more than one page
        if (totalPages > 1) {
            pages.push(totalPages)
        }

        return pages
    }

    const pageNumbers = getPageNumbers()

    return (
        <div className="flex items-center justify-center space-x-2 py-4">
            <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
            </Button>

            {pageNumbers.map((page, i) =>
                page === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2">
                        ...
                    </span>
                ) : (
                    <Button
                        key={`page-${page}`}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => typeof page === "number" && onPageChange(page)}
                        className="w-9"
                    >
                        {page}
                    </Button>
                ),
            )}

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
            </Button>
        </div>
    )
}
