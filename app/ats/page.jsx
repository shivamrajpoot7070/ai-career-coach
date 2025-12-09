"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateAtsScore } from "../../actions/ats";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { atsSchema } from "../lib/schema";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function AtsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(atsSchema)
  });
const onSubmit = async (values) => {
  try {
    setLoading(true);

    const formData = new FormData();
    formData.append("resumeFile", values.resumeFile[0]);
    formData.append("jobDescription", values.jobDescription);

    const result = await generateAtsScore(formData);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("ATS Score generated!");
    //router.push(`/ats/${result.report.id}`);
  } catch (err) {
    toast.error("Something went wrong!");
    console.log(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/resume-bg.jpg')" }} // SAME BACKGROUND
    >
      {/* Blur/Dark Overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/40"></div>

      <div className="relative flex justify-center pt-20 px-4">
        <Card className="w-full max-w-2xl bg-white/80 backdrop-blur-md shadow-xl border">
          <CardHeader>
            <CardTitle className="text-3xl font-bold gradient-title">
              ATS Score Generator
            </CardTitle>
            <CardDescription>
              Upload your resume & paste job description to generate ATS score.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Resume PDF Upload */}
              <div className="space-y-1">
                <label className="font-medium">Upload Resume (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  {...register("resumeFile")}
                  className="block w-full text-sm"
                />

                {errors.resumeFile && (
                  <p className="text-red-500 text-sm">
                    {errors.resumeFile.message}
                  </p>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-1">
                <label className="font-medium">Job Description</label>
                <Textarea
                  placeholder="Paste the job description here..."
                  rows={8}
                  {...register("jobDescription")}
                />
                {errors.jobDescription && (
                  <p className="text-red-500 text-sm">
                    {errors.jobDescription.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate ATS Score"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
