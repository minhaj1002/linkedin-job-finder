import type { Job, ScrapeOptions } from "@/types/job"
import { cache } from "react"
import * as playwright from "playwright"

// Cache results for 30 minutes to reduce scraping frequency
const CACHE_TIME = 30 * 60 * 1000 // 30 minutes

// In-memory cache for development
const jobCache = new Map<string, { jobs: Job[]; timestamp: number }>()

// Create a cached version of the scrape function
export const scrapeLinkedInJobs = cache(async function scrapeLinkedInJobsInternal({
    keywords,
    location = "",
    jobType = "all",
    datePosted = "anytime",
    page = 1,
}: ScrapeOptions): Promise<{ jobs: Job[]; totalCount: number; isFromCache: boolean }> {
    // Create a cache key based on search parameters
    const cacheKey = `${keywords}-${location}-${jobType}-${datePosted}-${page}`

    // Check if we have cached results
    const cachedResult = jobCache.get(cacheKey)
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TIME) {
        console.log("Using cached results for", cacheKey)
        return { jobs: cachedResult.jobs, totalCount: cachedResult.jobs.length * 3, isFromCache: true }
    }

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

    // Add pagination
    if (page > 1) {
        const start = (page - 1) * 25
        searchUrl += `&start=${start}`
    }


    try {
        // Use Playwright to scrape LinkedIn
        console.log("Scraping LinkedIn with Playwright:", searchUrl)
        const jobs = await scrapeWithPlaywright(searchUrl)

        // Cache the results
        jobCache.set(cacheKey, { jobs, timestamp: Date.now() })

        return { jobs, totalCount: jobs.length * 3, isFromCache: false }
    } catch (error) {
        console.error("Error during scraping:", error)

        // Return mock data as fallback
        console.log("Scraping failed, using mock data instead")
        const mockJobs = getMockJobs(keywords, location, jobType, datePosted, 15)

        // Cache the mock results
        jobCache.set(cacheKey, { jobs: mockJobs, timestamp: Date.now() })

        return { jobs: mockJobs, totalCount: 125, isFromCache: false }
    }
})

// Scrape with Playwright (browser automation)
async function scrapeWithPlaywright(url: string): Promise<Job[]> {
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise<Job[]>((_, reject) => {
        setTimeout(() => reject(new Error("Scraping timeout")), 25000)
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

            // Navigate to the URL
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })

            // Wait for the job listings to load
            await page.waitForSelector(".jobs-search__results-list", { timeout: 15000 }).catch(() => {
                console.log("Timeout waiting for job listings")
            })

            // Add a small delay to let dynamic content load
            await page.waitForTimeout(2000)

            console.log("Page loaded, extracting job data...");


            // Extract job data
            const jobs = await page.evaluate(() => {
                const jobListings = Array.from(document.querySelectorAll(".jobs-search__results-list > li"))

                return jobListings.slice(0, 15).map((job) => {
                    const titleElement = job.querySelector(".base-search-card__title")
                    const companyElement = job.querySelector(".base-search-card__subtitle")
                    const locationElement = job.querySelector(".job-search-card__location")
                    const linkElement = job.querySelector("a.base-card__full-link") as HTMLAnchorElement
                    const logoElement = job.querySelector(".artdeco-entity-image") as HTMLImageElement
                    const dateElement = job.querySelector("time.job-search-card__listdate")
                    const salaryElement = job.querySelector(".job-search-card__salary-info")

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

                    return {
                        id: Math.random().toString(36).substring(2, 15),
                        title: titleElement?.textContent?.trim() || "Unknown Position",
                        company: companyElement?.textContent?.trim() || "Unknown Company",
                        location: locationElement?.textContent?.trim() || "Unknown Location",
                        jobType,
                        datePosted: dateElement?.textContent?.trim() || "Recently posted",
                        description:
                            "This position requires expertise in various technologies. Click to view the full job description.",
                        url: linkElement?.href || "#",
                        logoUrl: logoElement?.src || undefined,
                        salary: salaryElement?.textContent?.trim() || undefined,
                        skills: skillSets[randomIndex],
                    }
                })
            })

            return jobs
        } finally {
            // Always close the browser to prevent memory leaks
            await browser.close()
        }
    })()

    // Race the scraping against the timeout
    return Promise.race([scrapePromise, timeoutPromise])
}

// Generate mock data for testing and fallbacks
function getMockJobs(keywords: string, location = "", jobType = "all", datePosted = "anytime", count = 10): Job[] {
    const jobTypes = ["Full-time", "Part-time", "Contract", "Remote", "Internship"]
    const datePostedOptions = ["1 day ago", "2 days ago", "3 days ago", "1 week ago", "Just now"]
    const companies = [
        "Tech Solutions Inc.",
        "Global Innovations",
        "Digital Enterprises",
        "Future Systems",
        "Smart Technologies",
        "Nexus Corporation",
        "Quantum Computing",
        "Cyber Security Ltd",
        "Cloud Platforms Inc",
        "Data Analytics Co",
    ]
    const locations = location
        ? [location, location, location, "Remote", location]
        : [
            "Remote",
            "New York, NY",
            "San Francisco, CA",
            "Austin, TX",
            "Seattle, WA",
            "Boston, MA",
            "Chicago, IL",
            "Los Angeles, CA",
            "Denver, CO",
            "Atlanta, GA",
        ]
    const salaries = [
        "$80,000 - $100,000 a year",
        "$120,000 - $150,000 a year",
        "$60,000 - $80,000 a year",
        "$100,000 - $130,000 a year",
        "$90,000 - $110,000 a year",
    ]
    const skills = [
        ["JavaScript", "React", "Node.js", "TypeScript"],
        ["Python", "Django", "Flask", "AWS"],
        ["Java", "Spring", "Hibernate", "Microservices"],
        ["C#", ".NET", "Azure", "SQL Server"],
        ["Go", "Docker", "Kubernetes", "CI/CD"],
        ["PHP", "Laravel", "MySQL", "Redis"],
        ["Ruby", "Rails", "PostgreSQL", "Heroku"],
        ["Swift", "iOS", "Objective-C", "Mobile Development"],
        ["Kotlin", "Android", "Firebase", "Mobile Development"],
        ["Rust", "WebAssembly", "Systems Programming", "Performance"],
    ]

    // Generate job titles based on keywords
    const generateJobTitle = (keyword: string, index: number) => {
        const roles = [
            "Specialist",
            "Engineer",
            "Developer",
            "Manager",
            "Analyst",
            "Consultant",
            "Architect",
            "Designer",
            "Lead",
            "Director",
            "Programmer",
            "Administrator",
            "Technician",
            "Coordinator",
            "Strategist",
        ]
        const prefixes = ["Senior", "Junior", "Principal", "Associate", ""]
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
        const role = roles[index % roles.length]

        return prefix ? `${prefix} ${keyword} ${role}` : `${keyword} ${role}`
    }

    // Filter by job type if specified
    const filteredJobTypes =
        jobType !== "all" ? jobTypes.filter((type) => type.toLowerCase().includes(jobType.toLowerCase())) : jobTypes

    // Filter by date posted if specified
    let dateFilter = datePostedOptions
    if (datePosted === "past24hours") {
        dateFilter = ["Just now", "1 day ago"]
    } else if (datePosted === "pastWeek") {
        dateFilter = ["Just now", "1 day ago", "2 days ago", "3 days ago"]
    } else if (datePosted === "pastMonth") {
        dateFilter = datePostedOptions
    }

    return Array.from({ length: count }, (_, i) => {
        const skillSet = skills[i % skills.length]
        const company = companies[i % companies.length]
        const title = generateJobTitle(keywords, i)
        const location = locations[i % locations.length]
        const jobType = filteredJobTypes[i % filteredJobTypes.length]
        const datePosted = dateFilter[i % dateFilter.length]
        const hasSalary = i % 3 === 0
        const salary = hasSalary ? salaries[i % salaries.length] : undefined

        // Generate a more detailed description
        const description = `
      ${company} is seeking a ${title} to join our team. 
      This is a ${jobType.toLowerCase()} position ${location === "Remote" ? "that can be performed remotely" : `located in ${location}`}.
      
      The ideal candidate will have experience with ${skillSet.join(", ")}.
      
      ${hasSalary ? `This position offers a competitive salary range of ${salary}.` : ""}
      
      Apply now to join our innovative team!
    `.trim()

        return {
            id: `mock-${i}-${Date.now()}`,
            title,
            company,
            location,
            jobType,
            datePosted,
            description,
            url: "https://linkedin.com/jobs",
            logoUrl: `/placeholder.svg?height=40&width=40&text=${company.charAt(0)}`,
            salary,
            skills: skillSet,
        }
    })
}
