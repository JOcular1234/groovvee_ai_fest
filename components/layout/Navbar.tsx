"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navLinks } from "@/data/event";

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Header background after scrolling
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu when the route changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes the menu (and returns focus to the toggle);
  // growing to desktop width closes it too
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open]);

  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-volt";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          open
            ? "border-white/10 bg-ink"
            : scrolled
              ? "border-white/10 bg-ink/90 backdrop-blur-md"
              : "border-transparent bg-transparent"
        }`}
      >
        <nav
          aria-label="Main"
          className="flex h-16 w-full items-center justify-between px-5 sm:h-20 sm:px-10 2xl:px-16"
        >
          <Link
            href="/"
            className={`flex shrink-0 items-center gap-3 ${focusRing}`}
            aria-label="Groovvee AI Fest — home"
          >
            <Image
              src="/groovveelogo.png"
              alt="Groovvee"
              width={203}
              height={66}
              priority
              className="h-7 w-auto invert sm:h-8"
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-volt">
              AI Fest
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-6 lg:flex xl:gap-8">
            <ul className="flex items-center gap-6 xl:gap-8">
              {navLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href} className="relative">
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`block py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:text-volt ${focusRing} ${
                        active ? "text-volt" : "text-white/80"
                      }`}
                    >
                      {link.label}
                    </Link>
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 500, damping: 40 }
                        }
                        className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-volt"
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            <Link
              href="/events"
              className={`inline-flex items-center gap-1.5 bg-volt px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white ${focusRing}`}
            >
              Explore Events
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            ref={toggleRef}
            type="button"
            className={`-mr-2 inline-flex size-11 items-center justify-center text-white lg:hidden ${focusRing}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? (
              <X className="size-6" aria-hidden />
            ) : (
              <Menu className="size-6" aria-hidden />
            )}
          </button>
        </nav>
      </header>

      {/*
        Rendered outside <header> on purpose: the header uses backdrop-blur,
        which makes any `fixed` child size itself to the header instead of
        the viewport.
      */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="fixed inset-0 z-40 flex h-dvh flex-col overflow-y-auto bg-ink pt-16 sm:pt-20 lg:hidden"
          >
            <ul className="flex flex-1 flex-col justify-center gap-1 px-6 py-6 sm:px-10">
              {navLinks.map((link, i) => {
                const active = isActive(pathname, link.href);
                return (
                  <motion.li
                    key={link.href}
                    initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.3 }}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-4 border-b border-white/10 py-3 font-display text-4xl uppercase sm:text-5xl ${focusRing} ${
                        active ? "text-volt" : "text-white"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 bg-volt"
                        />
                      )}
                      {link.label}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>

            <div className="border-t border-white/10 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10">
              <Link
                href="/events"
                className={`flex w-full items-center justify-center gap-2 bg-volt py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink ${focusRing}`}
              >
                Explore Events
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}