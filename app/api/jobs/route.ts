import { type NextRequest, NextResponse } from "next/server"
import { scrapeLinkedInJobs } from "@/app/actions/scrape-jobs"

export const maxDuration = 60 // Set max duration to 60 seconds for Edge functions

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const keywords = searchParams.get("keywords")

    if (!keywords) {
        return NextResponse.json({ error: "Keywords parameter is required" }, { status: 400 })
    }

    try {
        const location = searchParams.get("location") || ""
        const jobType = searchParams.get("jobType") || "all"
        const datePosted = searchParams.get("datePosted") || "anytime"
        const page = Number.parseInt(searchParams.get("page") || "1")

        // Add a timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), 50000)
        })

        const jobsPromise = scrapeLinkedInJobs({
            keywords,
            location,
            jobType,
            datePosted,
            page,
        })

        // Race the scraping against the timeout
        const result = (await Promise.race([jobsPromise, timeoutPromise])) as Awaited<typeof jobsPromise>

        return NextResponse.json({
            jobs: result.jobs,
            totalCount: result.totalCount,
            isFromCache: result.isFromCache,
            page,
        })
    } catch (error) {
        console.error("Error in jobs API:", error)

        // Return mock data on error
        // const mockJobs = Array.from({ length: 5 }, (_, i) => ({
        //     id: `error-fallback-${i}`,
        //     title: `${keywords} Professional`,
        //     company: `Company ${i + 1}`,
        //     location: "Remote",
        //     jobType: "Full-time",
        //     datePosted: "Recently",
        //     description: "This is a fallback job listing due to an error in the scraping process.",
        //     url: "https://linkedin.com/jobs",
        //     logoUrl: `/placeholder.svg?height=40&width=40`,
        // }))

        // Return mock data with 200 status to prevent frontend errors
        return NextResponse.json(
            {
                jobs: [],
                totalCount: 100,
                error: "Could not fetch real job listings, showing sample data instead",
                page: 1,
            },
            { status: 200 },
        )
    }
}
