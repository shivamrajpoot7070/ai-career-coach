import React from "react";
import { Button } from "./ui/button";
import {
  PenBox,
  LayoutDashboard,
  FileText,
  GraduationCap,
  ChevronDown,
  StarsIcon,
} from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { checkUser } from "@/lib/checkUser";
import NavActions from "./NavActions";
import HappyNewYearButton from "./HappyNewYearButton";
import ChatFloatingButton from "./chat/ChatFloatingButton";
import ChatWindow from "./chat/ChatWindow";


export default async function Header() {

   await checkUser();// ensure user exists in the database then move on to render the header
   // this function checks if the user exists in the database, if not it creates a new user

  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <Image
            src={"/prepprooo.png"}
            alt="Sensai Logo"
            width={190}
            height={190}
            className="w-32 md:w-40 ojbect-contain"
          />
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* // this part will show when user is signed in */}
          <SignedIn>    
            <NavActions />
          </SignedIn>

          {/* // this part will show when user is signed out */}

          <SignedOut> 
            <SignInButton>
              <Button variant="outline">Sign In</Button>
            </SignInButton>
          </SignedOut>

          {/* this is user button for profle and sign out */}
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
              afterSignOutUrl="/"
            />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}
