"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
    ExternalLink,
    Building,
    Clock,
    MapPin,
    Briefcase,
    AlertCircle,
    DollarSign,
    Bookmark,
    Share2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Pagination } from "./pagination"
import { JobSkeleton } from "./job-skeleton"
import Image from "next/image"
import type { Job } from "@/types/job"

export function JobResults() {
    const searchParams = useSearchParams()
    const [jobs, setJobs] = useState<Job[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [warning, setWarning] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [isFromCache, setIsFromCache] = useState(false)
    const [itemsPerPage] = useState(10) // Fixed at 10 items per page

    useEffect(() => {
        const keywords = searchParams.get("keywords")
        if (!keywords) return

        const fetchJobs = async () => {
            setIsLoading(true)
            setError(null)
            setWarning(null)

            try {
                const location = searchParams.get("location") || ""
                const jobType = searchParams.get("jobType") || "all"
                const datePosted = searchParams.get("datePosted") || "anytime"

                // Add a timeout to the fetch request
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 30000)

                // Remove page parameter from API call
                const response = await fetch(
                    `/api/jobs?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(
                        location,
                    )}&jobType=${jobType}&datePosted=${datePosted}`,
                    { signal: controller.signal },
                )

                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`)
                }

                const data = await response.json()

                // Check if there's a warning message from the API
                if (data.error) {
                    setWarning(data.error)
                } else if (!data.jobs || data.jobs.length === 0) {
                    setWarning("No jobs found matching your criteria. Try broadening your search.")
                }

                setJobs(data.jobs || [])
                setTotalCount(data.totalCount || 0)
                setIsFromCache(data.isFromCache || false)

                // Reset to first page when new search is performed
                setCurrentPage(1)
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.error("Error fetching jobs:", err)

                    if (err.name === "AbortError") {
                        setError("Request timed out. Please try again with a simpler search.")
                    } else {
                        setError(`Failed to fetch job listings: ${err.message}`)
                    }

                    // Set empty jobs array to avoid undefined errors
                    setJobs([])
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchJobs()
    }, [searchParams])

    const handlePageChange = (page: number) => {
        // Only update local state, no URL changes
        setCurrentPage(page)

        // Scroll to top
        window.scrollTo(0, 0)
    }

    if (!searchParams.get("keywords")) {
        return (
            <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    Enter search criteria above to find LinkedIn job listings
                </CardContent>
            </Card>
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Job Results</h2>
                    <Skeleton className="h-5 w-40" />
                </div>
                {[1, 2, 3].map((i) => (
                    <JobSkeleton key={i} />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>There was a problem fetching job listings</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, jobs.length)

    console.log({ jobs });


    // Get jobs for current page
    const displayedJobs = jobs.slice(startIndex, endIndex)

    // Calculate total pages
    const totalPages = Math.ceil(jobs.length / itemsPerPage)

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Job Results</h2>
                <p className="text-sm text-muted-foreground">
                    Found {totalCount} matching jobs {isFromCache && "(cached results)"}
                </p>
            </div>

            {warning && (
                <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{warning}</AlertDescription>
                </Alert>
            )}

            {jobs.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Results Found</CardTitle>
                        <CardDescription>We couldn&apos;t find any jobs matching your search criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Try adjusting your search terms or filters to see more results.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        {displayedJobs.map((job) => (
                            <Card key={job.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    {job.title}
                                                </a>
                                            </CardTitle>
                                            <CardDescription className="flex items-center">
                                                <Building className="h-3.5 w-3.5 mr-1" />
                                                {job.company}
                                            </CardDescription>
                                        </div>
                                        {job.logoUrl && (
                                            <div className="h-12 w-12 rounded overflow-hidden border p-1">
                                                <Image
                                                    src={job.logoUrl || "/placeholder.svg"}
                                                    alt={`${job.company} logo`}
                                                    className="h-full w-full object-contain"
                                                    width={48}
                                                    height={48}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-3">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge variant="outline" className="flex items-center">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {job.location}
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center">
                                            <Briefcase className="h-3 w-3 mr-1" />
                                            {job.jobType}
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {job.datePosted}
                                        </Badge>
                                        {job.salary && (
                                            <Badge variant="outline" className="flex items-center">
                                                <DollarSign className="h-3 w-3 mr-1" />
                                                {job.salary}
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-sm line-clamp-3">{job.description}</p>

                                    {job.skills && job.skills.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-muted-foreground mb-1">Skills:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {job.skills.map((skill: string, index: number) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Button asChild size="sm">
                                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                                            View Job <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                        </a>
                                    </Button>

                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" title="Save job">
                                            <Bookmark className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" title="Share job">
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {jobs.length > 10 && (
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    )}
                </>
            )}
        </div>
    )
}
