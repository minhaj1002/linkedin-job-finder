"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, MapPin, Filter, Briefcase, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function JobSearchForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)

    // Get current search params
    const currentKeywords = searchParams.get("keywords") || ""
    const currentLocation = searchParams.get("location") || ""
    const currentJobType = searchParams.get("jobType") || "all"
    const currentDatePosted = searchParams.get("datePosted") || "anytime"

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const searchParams = new URLSearchParams()

        searchParams.set("keywords", formData.get("keywords") as string)
        searchParams.set("location", formData.get("location") as string)
        searchParams.set("jobType", formData.get("jobType") as string)
        searchParams.set("datePosted", formData.get("datePosted") as string)
        searchParams.set("page", "1")

        router.push(`/?${searchParams.toString()}`)

        // Allow time for the URL to update before refreshing
        setTimeout(() => {
            setIsLoading(false)
        }, 500)
    }

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Search LinkedIn Jobs</CardTitle>
                <CardDescription>Enter your job search criteria to find relevant opportunities</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="keywords">Keywords</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="keywords"
                                name="keywords"
                                placeholder="Job title, skills, or company"
                                className="pl-8"
                                required
                                defaultValue={currentKeywords}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <div className="relative">
                            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="location"
                                name="location"
                                placeholder="City, state, or remote"
                                className="pl-8"
                                defaultValue={currentLocation}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="jobType" className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                Job Type
                            </Label>
                            <Select name="jobType" defaultValue={currentJobType}>
                                <SelectTrigger id="jobType" className="w-full">
                                    <SelectValue placeholder="Select job type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="fulltime">Full-time</SelectItem>
                                    <SelectItem value="parttime">Part-time</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="temporary">Temporary</SelectItem>
                                    <SelectItem value="internship">Internship</SelectItem>
                                    <SelectItem value="remote">Remote</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="datePosted" className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Date Posted
                            </Label>
                            <Select name="datePosted" defaultValue={currentDatePosted}>
                                <SelectTrigger id="datePosted" className="w-full">
                                    <SelectValue placeholder="Select time period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="anytime">Any Time</SelectItem>
                                    <SelectItem value="past24hours">Past 24 hours</SelectItem>
                                    <SelectItem value="pastWeek">Past Week</SelectItem>
                                    <SelectItem value="pastMonth">Past Month</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Filter className="mr-2 h-4 w-4" />
                                Search Jobs
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
