import { Hero } from "@/components/home/Hero";
import { Ticker } from "@/components/ui/Ticker";
import { Countdown } from "@/components/home/Countdown";
import { About } from "@/components/home/About";
import { FeaturedCommunities } from "@/components/home/FeaturedCommunities";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { FeaturedSpeakers } from "@/components/home/FeaturedSpeakers";
import { TopicsPreview } from "@/components/home/TopicsPreview";
import { Experience } from "@/components/home/Experience";
import { TicketPromotion } from "@/components/home/TicketPromotion";
import { Sponsors } from "@/components/home/Sponsors";
import { Faq } from "@/components/home/Faq";
import { getFeaturedOrNextEvent } from "@/lib/public/events";

export default async function Home() {
  const nextEvent = await getFeaturedOrNextEvent();

  return (
    <>
      <Hero />
      <Ticker />
      <Countdown
        target={
          nextEvent
            ? {
                iso: nextEvent.startsAt.toISOString(),
                title: nextEvent.title,
                slug: nextEvent.slug,
                timezone: nextEvent.timezone,
              }
            : null
        }
      />
      <About />
      <FeaturedCommunities />
      <UpcomingEvents />
      <FeaturedSpeakers />
      <TopicsPreview />
      <Experience />
      <TicketPromotion />
      <Sponsors />
      <Faq />
    </>
  );
}
