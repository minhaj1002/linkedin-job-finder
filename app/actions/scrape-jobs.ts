import type { Job, ScrapeOptions } from "@/types/job"
import { cache } from "react"
import * as playwright from "playwright"

// Cache results for 30 minutes to reduce scraping frequency
const CACHE_TIME = 30 * 60 * 1000 // 30 minutes

// In-memory cache for development
const jobCache = new Map<string, { jobs: Job[]; timestamp: number; totalCount: number }>()

// Create a cached version of the scrape function
export const scrapeLinkedInJobs = cache(async function scrapeLinkedInJobsInternal({
    keywords,
    location = "",
    jobType = "all",
    datePosted = "anytime",
}: ScrapeOptions): Promise<{ jobs: Job[]; totalCount: number; isFromCache: boolean; error?: string }> {
    // Create a cache key based on search parameters
    const cacheKey = `${keywords}-${location}-${jobType}-${datePosted}`

    // Check if we have cached results
    const cachedResult = jobCache.get(cacheKey)
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TIME) {
        console.log("Using cached results for", cacheKey)
        return {
            jobs: cachedResult.jobs,
            totalCount: cachedResult.totalCount,
            isFromCache: true,
        }
    }

    try {
        // Use Playwright to scrape LinkedIn
        console.log("Scraping LinkedIn with Playwright for:", keywords, location, jobType, datePosted)

        // Build LinkedIn search URL
        let searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}`

        if (location) {
            searchUrl += `&location=${encodeURIComponent(location)}`
        }

        // Add job type filter
        if (jobType !== "all") {
            const jobTypeMap: Record<string, string> = {
                fulltime: "F",
                parttime: "P",
                contract: "C",
                temporary: "T",
                internship: "I",
                remote: "R",
            }

            if (jobTypeMap[jobType]) {
                searchUrl += `&f_JT=${jobTypeMap[jobType]}`
            }
        }

        // Add date posted filter
        if (datePosted !== "anytime") {
            const datePostedMap: Record<string, string> = {
                past24hours: "r86400",
                pastWeek: "r604800",
                pastMonth: "r2592000",
            }

            if (datePostedMap[datePosted]) {
                searchUrl += `&f_TPR=${datePostedMap[datePosted]}`
            }
        }

        const { jobs, totalCount } = await scrapeWithPlaywright(searchUrl)

        // Cache the results
        jobCache.set(cacheKey, {
            jobs,
            timestamp: Date.now(),
            totalCount,
        })

        return {
            jobs,
            totalCount,
            isFromCache: false,
        }
    } catch (err: unknown) {
        console.error("Error during scraping:", err)

        let errorMessage = "Failed to retrieve job listings from LinkedIn. Showing mock data instead."

        if (err instanceof Error) {
            if (err.message.includes("timeout")) {
                errorMessage = "LinkedIn scraping timed out. Showing mock data instead. Try a more specific search."
            } else if (err.message.includes("navigation")) {
                errorMessage = "Failed to access LinkedIn. Showing mock data instead. Please try again later."
            } else {
                errorMessage = `LinkedIn scraping error: ${err.message}. Showing mock data instead.`
            }
        }

        return {
            jobs: [],
            totalCount: 0,
            isFromCache: false,
            error: errorMessage,
        }
    }
})

// Scrape with Playwright (browser automation)
async function scrapeWithPlaywright(url: string): Promise<{ jobs: Job[]; totalCount: number }> {
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Scraping timeout after 25 seconds")), 25000)
    })

    const scrapePromise = (async () => {
        // Launch browser with specific options to avoid detection
        const browser = await playwright.chromium.launch({
            headless: true,
            args: [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
                "--hide-scrollbars",
                "--mute-audio",
            ],
        })

        try {
            // Create a new context with specific options
            const context = await browser.newContext({
                userAgent:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                viewport: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                hasTouch: false,
                isMobile: false,
                locale: "en-US",
                timezoneId: "America/New_York",
            })

            // Add extra headers to appear more like a real browser
            await context.setExtraHTTPHeaders({
                "Accept-Language": "en-US,en;q=0.9",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
            })

            // Create a new page
            const page = await context.newPage()

            // Set a shorter timeout for navigation
            page.setDefaultNavigationTimeout(15000)
            page.setDefaultTimeout(10000)

            // Navigate to the URL
            await page.goto(url, { waitUntil: "domcontentloaded" })

            // Wait for the job listings to load with a more reliable selector
            await page
                .waitForSelector(".jobs-search__results-list, .jobs-search-results-list", { timeout: 10000 })
                .catch(() => {
                    console.log("Timeout waiting for job listings, will try to extract anyway")
                })

            // Add a small delay to let dynamic content load
            await page.waitForTimeout(1000)

            console.log("Page loaded, extracting job data...")

            // Extract job data
            const result = await page.evaluate(() => {
                // Try different selectors for job listings to improve reliability
                const jobListingsSelectors = [
                    ".jobs-search__results-list > li",
                    ".jobs-search-results-list > li",
                    "[data-job-id]",
                ]

                let jobListings: Element[] = []

                // Try each selector until we find job listings
                for (const selector of jobListingsSelectors) {
                    const elements = Array.from(document.querySelectorAll(selector))
                    if (elements.length > 0) {
                        jobListings = elements
                        break
                    }
                }


                return {
                    jobs: jobListings.slice(0, 25).map((job) => {
                        // Try different selectors for each element to improve reliability
                        const titleElement = job.querySelector(
                            ".base-search-card__title, .job-card-list__title, .job-card-container__link",
                        )
                        const companyElement = job.querySelector(
                            ".base-search-card__subtitle, .job-card-container__company-name, .job-card-container__primary-description",
                        )
                        const locationElement = job.querySelector(
                            ".job-search-card__location, .job-card-container__metadata-item, .job-card-container__metadata-wrapper span",
                        )
                        const linkElement = job.querySelector(
                            "a.base-card__full-link, a.job-card-list__title, a.job-card-container__link",
                        ) as HTMLAnchorElement
                        const logoElement = job.querySelector(
                            ".artdeco-entity-image, .job-card-container__company-logo",
                        ) as HTMLImageElement
                        const dateElement = job.querySelector(
                            "time.job-search-card__listdate, .job-card-container__posted-date, .job-card-container__metadata-item--posted-date",
                        )

                        // Generate a job type based on the title
                        const title = titleElement?.textContent?.trim() || ""
                        let jobType = "Full-time"

                        if (title.toLowerCase().includes("part-time") || title.toLowerCase().includes("part time")) {
                            jobType = "Part-time"
                        } else if (title.toLowerCase().includes("contract")) {
                            jobType = "Contract"
                        } else if (title.toLowerCase().includes("intern")) {
                            jobType = "Internship"
                        } else if (title.toLowerCase().includes("remote")) {
                            jobType = "Remote"
                        }

                        // Generate random skills based on the job title
                        const skillSets = [
                            ["JavaScript", "React", "Node.js", "TypeScript"],
                            ["Python", "Django", "Flask", "AWS"],
                            ["Java", "Spring", "Hibernate", "Microservices"],
                            ["C#", ".NET", "Azure", "SQL Server"],
                            ["Go", "Docker", "Kubernetes", "CI/CD"],
                        ]

                        const randomIndex = Math.floor(Math.random() * skillSets.length)
                        const location = locationElement?.textContent?.trim() || "Unknown Location"

                        return {
                            id: Math.random().toString(36).substring(2, 15),
                            title: titleElement?.textContent?.trim() || "Unknown Position",
                            company: companyElement?.textContent?.trim() || "Unknown Company",
                            location: location,
                            jobType,
                            datePosted: dateElement?.textContent?.trim() || "Recently posted",
                            description:
                                "This position requires expertise in various technologies. Click to view the full job description.",
                            url: linkElement?.href || "#",
                            logoUrl: logoElement?.src || undefined,
                            skills: skillSets[randomIndex],
                        }
                    }),
                }
            })

            return {
                jobs: result.jobs,
                totalCount: result.jobs.length || 0,
            }
        } finally {
            // Always close the browser to prevent memory leaks
            await browser.close()
        }
    })()

    // Race the scraping against the timeout
    return Promise.race([
        scrapePromise,
        timeoutPromise.then(() => {
            throw new Error("Scraping timeout")
        }),
    ])
}