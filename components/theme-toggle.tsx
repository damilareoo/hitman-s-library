"use client"

import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

type Theme = "light" | "dark" | "system"

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) {
      setTheme(stored)
      applyTheme(stored)
    } else {
      applyTheme("system")
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement

    if (newTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.toggle("dark", systemDark)
    } else {
      root.classList.toggle("dark", newTheme === "dark")
    }
  }

  const cycleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(nextTheme)
    localStorage.setItem("theme", nextTheme)
    applyTheme(nextTheme)
  }

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system")
      }
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  return (
    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={cycleTheme} title={`Theme: ${theme}`}>
      {theme === "light" && <Sun className="h-4 w-4" weight="regular"  />}
      {theme === "dark" && <Moon className="h-4 w-4" weight="regular"  />}
      {theme === "system" && <Monitor className="h-4 w-4" weight="regular"  />}
    </Button>
  )
}
