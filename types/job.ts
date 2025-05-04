export interface ScrapeOptions {
    keywords: string
    location?: string
    jobType?: string
    datePosted?: string
    page?: number
}

export interface Job {
    id: string
    title: string
    company: string
    location: string
    jobType: string
    datePosted: string
    description: string
    url: string
    logoUrl?: string
    salary?: string
    skills?: string[]
}