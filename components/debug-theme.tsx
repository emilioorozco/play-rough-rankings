"use client";

import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "./theme-provider";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Sun, Moon } from "lucide-react";

export function DebugTheme() {
  const themeContext = useContext(ThemeContext);
  const [htmlClass, setHtmlClass] = useState("");
  const [bodyBg, setBodyBg] = useState("");
  const [cssBackground, setCssBackground] = useState("");

  useEffect(() => {
    const updateDebugInfo = () => {
      if (typeof document !== "undefined") {
        setHtmlClass(document.documentElement.className);
        setCssBackground(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--background",
          ),
        );
        setBodyBg(window.getComputedStyle(document.body).backgroundColor);
      }
    };

    updateDebugInfo();

    // Update every second to catch changes
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!themeContext) return null;

  return (
    <Card className="w-full max-w-md mx-auto my-8 border-2 border-dashed border-accent/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {themeContext.theme === "light" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          Theme Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Current Theme:</span>
          <Badge
            variant={themeContext.theme === "dark" ? "destructive" : "accent"}
          >
            {themeContext.theme}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Colors Preview:</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs">
              Primary
            </div>
            <div className="h-8 bg-secondary rounded flex items-center justify-center text-secondary-foreground text-xs">
              Secondary
            </div>
            <div className="h-8 bg-accent rounded flex items-center justify-center text-accent-foreground text-xs">
              Accent
            </div>
          </div>
        </div>

        <Button
          onClick={themeContext.toggleTheme}
          className="w-full"
          variant="outline"
        >
          Switch to {themeContext.theme === "light" ? "Dark" : "Light"} Mode
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p
            className={
              htmlClass !== themeContext.theme ? "text-red-500 font-bold" : ""
            }
          >
            HTML class: {htmlClass || "N/A"}{" "}
            {htmlClass !== themeContext.theme && "⚠️ MISMATCH!"}
          </p>
          <p>Theme Provider: {themeContext.theme}</p>
          <p>
            LocalStorage:{" "}
            {typeof localStorage !== "undefined"
              ? localStorage.getItem("theme") || "none"
              : "N/A"}
          </p>
          <p>CSS --background: {cssBackground || "N/A"}</p>
          <p>HSL computed: hsl({cssBackground})</p>
          <p
            className={
              bodyBg.includes("255, 255, 0") || bodyBg.includes("194, 175, 66")
                ? "text-red-500 font-bold"
                : ""
            }
          >
            Body BG: {bodyBg || "N/A"}{" "}
            {(bodyBg.includes("255, 255, 0") ||
              bodyBg.includes("194, 175, 66")) &&
              "⚠️ WRONG COLOR!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
