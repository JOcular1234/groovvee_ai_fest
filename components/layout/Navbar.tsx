"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/data/event";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-white/10 bg-ink/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Groovvee AI Fest — home"
        >
          <Image
            src="/groovveelogo.png"
            alt="Groovvee"
            width={203}
            height={66}
            priority
            className="h-8 w-auto invert"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-volt">
            AI Fest
          </span>
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:text-volt ${
                pathname === link.href ? "text-volt" : "text-white/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 bg-volt px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white"
          >
            Explore Events
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center p-2 text-white lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-16 z-40 flex flex-col bg-ink lg:hidden"
          >
            <div className="flex flex-1 flex-col justify-center gap-2 px-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.3 }}
                >
                  <Link
                    href={link.href}
                    className={`block py-3 font-display text-5xl uppercase ${
                      pathname === link.href ? "text-volt" : "text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="border-t border-white/10 p-6">
              <Link
                href="/events"
                className="flex w-full items-center justify-center gap-2 bg-volt py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink"
              >
                Explore Events
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
