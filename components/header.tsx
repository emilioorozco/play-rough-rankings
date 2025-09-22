"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession } from "./auth/session-provider";
import { useRouter } from "next/navigation";
import { Bell, Menu, X, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ActivityIndicator } from "./activity-indicator";
import { useTheme } from "@/stores/app-store";
import { useLoadingBar } from "@/stores/loading-store";
import { SearchComponent } from "./search";
import { LoginModal } from "./auth/login-modal";
import { useModal, useInteraction } from "@/hooks/stores";

export function Header() {
  const { user, signOut, isLoading } = useSession();
  const { showLoadingBar } = useLoadingBar();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserInfoInDropdown, setShowUserInfoInDropdown] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  // Use store hooks for modal and interaction state
  const { isOpen: isLoginModalOpen, open: openLoginModal, close: closeLoginModal } = useModal('login');
  const { isActive: isUserMenuOpen, activate: openUserMenu, deactivate: closeUserMenu } = useInteraction('userMenu');

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        closeUserMenu();
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen, closeUserMenu]);

  // Calculate whether to show user info in dropdown based on available space
  useEffect(() => {
    const calculateUserInfoVisibility = () => {
      if (!user) return;
      
      const isLandscape = window.innerWidth > window.innerHeight;
      const isSmallScreen = window.innerWidth < 768; // md breakpoint
      const isPortrait = window.innerHeight > window.innerWidth;
      
      // Show user info in dropdown if:
      // - It's portrait mode on any screen size
      // - It's landscape but the height (which is the phone's width in portrait) is too small
      const shouldShow = isPortrait || (isLandscape && window.innerHeight < 350);
      
      setShowUserInfoInDropdown(shouldShow);
    };

    calculateUserInfoVisibility();
    window.addEventListener('resize', calculateUserInfoVisibility);
    window.addEventListener('orientationchange', calculateUserInfoVisibility);

    return () => {
      window.removeEventListener('resize', calculateUserInfoVisibility);
      window.removeEventListener('orientationchange', calculateUserInfoVisibility);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      closeUserMenu();
      router.push("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "admin" as const;
      case "organizer":
        return "organizer" as const;
      case "player":
        return "player" as const;
      default:
        return "secondary" as const;
    }
  };

  const getMenuItems = (): Array<{ href: string; label: string; icon: string }> => {
    if (!user) return [];

    const items: Array<{ href: string; label: string; icon: string }> = [
      { href: "/", label: "Dashboard", icon: "📊" },
      { href: "/profile", label: "Profile", icon: "👤" },
    ];

    // Add role-specific menu items
    if (user.role === "organizer" || user.role === "admin") {
      items.push(
        {
          href: "/tournaments/manage",
          label: "Manage Tournaments",
          icon: "🏆",
        },
        { href: "/tournaments/create", label: "Create Tournament", icon: "➕" },
      );
    }

    if (user.role === "admin") {
      items.push(
        { href: "/admin", label: "Admin Panel", icon: "⚙️" },
        { href: "/admin/users", label: "Manage Users", icon: "👥" },
        { href: "/admin/stores", label: "Manage Stores", icon: "🏪" },
      );
    }

    return items;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo and Navigation */}
          <div
            className={`flex items-center gap-8 ${user ? "" : "flex-shrink-0"}`}
          >
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-all duration-200"
            >
              <svg
                className="h-8 w-8 text-primary"
                viewBox="0 0 467 467"
                fill="currentColor"
                role="img"
                aria-label="Play Rough Logo"
              >
                <path d="M245 62C249.78 68.7863 256.192 74.4314 261.338 81C269.364 91.2444 275.447 102.281 281 114C288.218 110.788 293.854 104.819 302 103.482C313.559 101.585 325.851 109.913 330.761 120C332.88 124.354 333.125 129.306 334 134C347.902 130.322 365.334 133.92 367.79 151C368.714 157.424 364.244 162.984 364.935 169C365.725 175.877 370.503 182.831 371.675 190C374.426 206.831 370.789 222.529 368 239C373.878 235.544 376.986 228.039 379.688 222C387.387 204.786 390.095 183.677 387.421 165C382.197 128.52 368.577 90.5786 341.999 64.0008C321.912 43.9138 293.667 34.3487 267 47.2585C258.935 51.1628 251.608 55.932 245 62M19 123C30.364 119.379 40.8875 111.179 52 106.427C63.7634 101.398 78.1812 96.988 91 96.0895C97.0832 95.6631 102.957 96.8752 109 97L109 99C101.792 99 95.0419 100.164 88 101.574C85.0353 102.168 81.7167 102.222 79.0602 103.829C74.0837 106.839 70.958 113.299 67.8333 118C59.06 131.198 51.5928 145.436 45.3333 160C20.6993 217.317 17.3202 282.753 43.713 340C48.7291 350.88 54.9016 361.117 61.662 371C64.9729 375.84 68.8224 382.076 74 385C73.1215 374.938 68.3087 364.788 65.7346 355C62.9235 344.311 61.8423 332.993 61.0895 322C58.2761 280.917 71.6025 238.233 91.8719 203C97.2354 193.677 104.708 185.98 110.451 177C114.256 171.052 109.293 161.144 110.185 154C111.344 144.724 119.64 135.644 129 134.213C135.003 133.296 140.194 135.293 146 136C146.124 121.263 156.316 106.846 172 106.105C177.087 105.865 182.407 107.847 187 109.877C193.572 112.78 197.023 120.084 203.17 122.802C206.158 124.123 209.929 122.445 213 122.174C216.693 121.849 220.465 122.51 224 123.57C244.38 129.685 255.987 151.782 256 172C262.581 168.905 266.04 162.089 269.576 156C272.407 151.124 277.439 144.834 277.602 139C277.786 132.429 272.965 123.949 270.421 118C261.31 96.6956 246.701 77.3541 229 62.4391C187.515 27.4839 124.932 43.0208 82 67.5787C73.7912 72.2743 65.5972 76.9762 58 82.6296C49.355 89.0627 41.601 96.3867 34 104C28.4057 109.603 22.256 115.693 19 123M397 81C401.706 100.86 408.496 119.35 409.91 140C412.678 180.412 402.896 221.494 383.691 257C377.289 268.837 369.182 279.069 361.459 290C356.867 296.5 362.595 303.591 361.826 311C360.771 321.154 353.193 330.605 343 332.532C337.277 333.614 331.697 332.45 326 332C323.387 352.22 306.545 367.162 286 358.272C282.015 356.547 278.214 353.829 275.093 350.827C273.104 348.914 271.379 345.66 268.675 344.693C266.054 343.756 262.656 345.073 260 345.37C256.427 345.77 252.456 345.388 249 344.367C226.245 337.639 217 315.589 217 294C210.429 296.004 207.036 303.547 203.496 309C200.433 313.718 195.448 320.299 194.708 326C193.927 332.003 198.191 340.563 200.449 346C208.131 364.494 219.683 381.913 234.015 395.961C246.657 408.353 262.471 418.613 280 422.331C293.668 425.23 307.422 423.609 321 421.25C352.223 415.825 382.69 401.827 408 382.873C418.497 375.013 427.747 366.268 437 357C442.231 351.761 448.575 346.147 451 339C440.548 344.819 430.939 351.683 420 356.691C401.29 365.258 381.405 369 361 369L361 367C366.811 366.75 372.3 365.085 378 364.084C381.595 363.453 385.85 363.445 388.985 361.397C394.525 357.779 398.386 350.394 401.999 345C411.198 331.27 418.921 317.19 425.421 302C448.651 247.716 452.341 184.856 428.85 130C421.759 113.442 412.063 91.6993 397 81M281 216C289.449 214.301 295.205 206.354 300.385 200C313.265 184.2 321.639 164.291 323.95 144C324.749 136.982 325.951 129.615 322.547 123.001C316.344 110.946 301.841 111.246 292 118.055C289.466 119.808 286.363 122.013 285.212 125.004C284.022 128.097 285.874 131.976 286.625 135C288.08 140.859 288.97 146.961 288.999 153C289.106 175.147 285.959 194.564 281 216M195 218C194.718 211.837 192.391 206.079 191.439 200C190.198 192.074 190 184.007 190 176C190 166.275 189.922 156.636 191.439 147C192.271 141.716 195.374 135.267 195.049 130C194.805 126.061 191.007 122.761 187.999 120.649C179.602 114.753 165.76 113.607 158.789 122.185C152.464 129.969 153.779 140.875 155.424 150C158.801 168.72 165.816 186.631 177.156 202C181.708 208.169 187.571 215.474 195 218M330 196C343.91 194.142 354.492 175.38 357.841 163C359.145 158.179 360.167 151.48 357.258 147.043C352.927 140.44 334.403 137.271 332.839 148.043C332.369 151.277 334.241 154.818 334.7 158C335.397 162.84 335.176 168.121 334.961 173C334.608 180.987 330.782 188.159 330 196M149 201C145.81 189.843 142.519 179.875 143.039 168C143.212 164.061 143.73 159.865 144.513 156C145.004 153.577 146.298 150.758 144.932 148.39C140.055 139.939 123.893 143.68 120.179 151.004C117.817 155.663 119.036 162.233 120.439 167C124.259 179.973 134.625 198.218 149 201M102 228C89.2371 245.872 85 267.526 85 289C85 326.331 98.5333 363.296 121.13 393C142.169 420.655 176.164 434.982 209 419.019C216.206 415.515 222.348 410.605 228 405C221.024 396.348 212.546 389.087 205.885 380C199.909 371.846 196.062 362.673 191 354C183.827 357.192 178.153 362.618 170 363.79C151.814 366.405 139.011 350.902 139 334C133.244 334.975 127.962 336.699 122 335.787C112.229 334.293 104.165 324.538 103.174 315C102.528 308.782 106.498 302.932 105.567 297C105.08 293.892 103.339 291.006 102.44 288C99.8254 279.262 97.4463 268.133 98.3002 259C98.9614 251.927 99.9474 245.024 101.004 238C101.513 234.616 102.977 231.303 102 228M276 249C280.204 269.412 283.353 288.955 281.91 310C281.507 315.891 280.647 322.263 279.252 328C278.331 331.783 276.218 336.179 278.042 339.999C284.964 354.491 308.181 355.553 315.08 341C318.658 333.454 317.031 323.874 315.614 316C312.366 297.953 305.794 280.873 294.844 266C289.967 259.375 284.315 251.162 276 249M191 251C183.196 254.304 177.37 261.354 172.375 268C161.43 282.564 153.208 299.111 149.552 317C148.109 324.056 145.914 331.836 147.761 339C152.065 355.698 175.607 359.833 185.382 344.91C187.548 341.602 186.109 337.556 185.4 334C183.946 326.718 182.873 319.39 182.17 312C180.851 298.138 183.404 282.513 186.5 269C187.877 262.989 190.388 257.14 191 251M324 267C325.247 279.444 330.069 290.035 328.83 303C328.418 307.317 324.554 316.629 327.042 320.362C333.544 330.117 349.668 323.145 352.207 314C353.574 309.075 351.862 303.7 350.329 299C346.003 285.741 337.118 272.661 324 267M142 271C137.693 272.429 134.313 274.987 131.004 278.09C121.679 286.835 108.465 305.258 113.742 318.999C116.979 327.429 131.654 330.628 137.382 322.775C140.554 318.427 136.413 309.068 136.09 304C135.358 292.502 140.889 282.156 142 271z" />
              </svg>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Play Rough
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">Rankings</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/tournaments">
                <Button
                  variant="ghost"
                  className="hover:text-primary transition-colors duration-200"
                >
                  Tournaments
                </Button>
              </Link>
              <Link href="/leaderboards">
                <Button
                  variant="ghost"
                  className="hover:text-primary transition-colors duration-200"
                >
                  Leaderboards
                </Button>
              </Link>
              <Link href="/players">
                <Button
                  variant="ghost"
                  className="hover:text-primary transition-colors duration-200"
                >
                  Players
                </Button>
              </Link>
              {user && (user.role === "organizer" || user.role === "admin") && (
                <Link href="/tournaments/manage">
                  <Button
                    variant="ghost"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Organize
                  </Button>
                </Link>
              )}
            </nav>
          </div>

          {/* Search - Desktop Only */}
          <div
            className={`hidden md:flex mx-2 sm:mx-4 ${
              user ? "flex-1 max-w-sm sm:max-w-md" : "flex-[2] min-w-0"
            }`}
          >
            <SearchComponent
              placeholder="Search tournaments, players..."
              className="w-full"
            />
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Notifications */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent transition-colors duration-200"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-primary-foreground text-xs p-0 flex items-center justify-center">
                  3
                </Badge>
              </Button>
            )}


            {/* User Menu */}
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            ) : user ? (
              <div
                className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border"
                ref={userMenuRef}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {user.name
                        ? user.name.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-foreground">
                      {user.name || "User"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getRoleBadgeVariant(user.role)}
                        className="text-xs"
                      >
                        {user.role}
                      </Badge>
                      <ActivityIndicator showDetails={false} />
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => isUserMenuOpen ? closeUserMenu() : openUserMenu()}
                  className="hover:bg-accent transition-colors duration-200"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`}
                  />
                </Button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute top-full right-4 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 animate-fade-in max-h-[80vh] flex flex-col">
                    {/* User Info Section - Conditionally shown */}
                    {showUserInfoInDropdown && (
                      <div className="p-4 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {user.name
                                ? user.name.charAt(0).toUpperCase()
                                : user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-card-foreground">
                              {user.name || "User"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                            <Badge
                              variant={getRoleBadgeVariant(user.role)}
                              className="text-xs mt-1"
                            >
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mobile Search - Only show on mobile */}
                    <div className="md:hidden p-4 border-b border-border flex-shrink-0">
                      <SearchComponent placeholder="Search tournaments, players..." />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <nav className="p-2">
                        {/* Main Navigation Links - Only show on mobile */}
                        <div className="md:hidden">
                          <Link
                            href="/tournaments"
                            onClick={() => closeUserMenu()}
                          >
                            <Button variant="ghost" className="w-full justify-start">
                              Tournaments
                            </Button>
                          </Link>
                          <Link
                            href="/leaderboards"
                            onClick={() => closeUserMenu()}
                          >
                            <Button variant="ghost" className="w-full justify-start">
                              Leaderboards
                            </Button>
                          </Link>
                          <Link
                            href="/players"
                            onClick={() => closeUserMenu()}
                          >
                            <Button variant="ghost" className="w-full justify-start">
                              Players
                            </Button>
                          </Link>
                          <div className="border-t border-border my-2"></div>
                        </div>

                        {/* User-specific menu items */}
                        {getMenuItems().map((item) => (
                          <Link
                            key={item.href}
                            href={item.href as any}
                            onClick={() => closeUserMenu()}
                          >
                            <Button variant="ghost" className="w-full justify-start">
                              {item.label}
                            </Button>
                          </Link>
                        ))}
                      </nav>
                    </div>

                    <div className="p-2 border-t border-border flex-shrink-0">
                      {/* Theme Toggle */}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          toggleTheme();
                          closeUserMenu();
                        }}
                        className="w-full justify-start mb-2"
                      >
                        {theme === "light" ? (
                            "Switch to Dark Mode"
                          ) : (
                            "Switch to Light Mode"
                          )}
                        </Button>
                      
                      {/* Test Loading Bar Button - Development Only */}
                      {process.env.NODE_ENV === 'development' && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            showLoadingBar(3000);
                            closeUserMenu();
                          }}
                          className="w-full justify-start mb-2 text-xs"
                        >
                          Test Loading
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button 
                onClick={() => openLoginModal()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
              >
                Sign In
              </Button>
            )}

            {/* Mobile Menu Toggle - Only show for non-logged-in users */}
            {!user && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-accent transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Only show for non-logged-in users */}
        {!user && isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border animate-slide-in">
            {/* Mobile Search */}
            <div className="mb-4">
              <SearchComponent placeholder="Search tournaments, players..." />
            </div>

            <nav className="flex flex-col gap-2">
              <Link
                href="/tournaments"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start">
                  Tournaments
                </Button>
              </Link>
              <Link
                href="/leaderboards"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start">
                  Leaderboards
                </Button>
              </Link>
              <Link href="/players" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Players
                </Button>
              </Link>

              {/* Theme Toggle in Mobile Menu */}
              <div className="pt-2 mt-2 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    toggleTheme();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-3"
                >
                  {theme === "light" ? (
                      <>
                        <Moon className="h-4 w-4" />
                        Switch to Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4" />
                        Switch to Light Mode
                      </>
                    )}
                  </Button>
                </div>
            </nav>
          </div>
        )}
      </div>
      
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => closeLoginModal()}
        onSuccess={() => {
          closeLoginModal();
          // Optionally redirect or show success message
        }}
      />
    </header>
  );
}
