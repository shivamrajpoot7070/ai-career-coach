"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import FancyLoader from "./FancyLoader";
import { Button } from "./ui/button";
import {
  LayoutDashboard,
  FileText,
  PenBox,
  GraduationCap,
  StarsIcon,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function NavActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (url) => {
    startTransition(() => {
      router.push(url);
      router.refresh();
    });
  };

  const iconOrLoader = (icon) => (isPending ? <FancyLoader /> : icon);

  return (
    <div className="flex items-center space-x-2 md:space-x-4">

      {/* Dashboard */}
      <Button
        variant="outline"
        className="hidden md:inline-flex items-center gap-2"
        onClick={() => navigate("/dashboard")}
      >
        {iconOrLoader(<LayoutDashboard className="h-4 w-4" />)}
        Industry Insights
      </Button>

      {/* Mobile button */}
      <Button
        variant="ghost"
        className="md:hidden w-10 h-10 p-0"
        onClick={() => navigate("/dashboard")}
      >
        {iconOrLoader(<LayoutDashboard className="h-4 w-4" />)}
      </Button>

      {/* Growth Tools */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2">
            {iconOrLoader(<StarsIcon className="h-4 w-4" />)}
            <span className="hidden md:block">Growth Tools</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">

          <DropdownMenuItem onClick={() => navigate("/resume")}>
            {iconOrLoader(<FileText className="h-4 w-4" />)}
            Build Resume
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/ai-cover-letter")}>
            {iconOrLoader(<PenBox className="h-4 w-4" />)}
            Cover Letter
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/interview")}>
            {iconOrLoader(<GraduationCap className="h-4 w-4" />)}
            Interview Prep
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
