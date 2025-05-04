import type { Metadata } from "next"
import { JobSearchForm } from "./_components/job-search-form"
import { JobResults } from "./_components/job-results"

export const metadata: Metadata = {
  title: "LinkedIn Job Finder | Find Your Dream Job",
  description:
    "Search for jobs on LinkedIn with advanced filters. Find the perfect job match based on keywords, location, job type, and more.",
  openGraph: {
    title: "LinkedIn Job Finder | Find Your Dream Job",
    description:
      "Search for jobs on LinkedIn with advanced filters. Find the perfect job match based on keywords, location, job type, and more.",
    type: "website",
  },
}

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">LinkedIn Job Finder</h1>
      <p className="text-center text-muted-foreground mb-8">
        Find your dream job with our advanced LinkedIn job search tool
      </p>
      <div className="max-w-4xl mx-auto">
        <JobSearchForm />
        <JobResults />
      </div>
    </main>
  )
}
