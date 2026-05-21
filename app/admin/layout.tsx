import type { Metadata } from "next";
import "./backend.css";
import Navigation from "./components/Navigation";
import { TrackingProvider } from "./context/TrackingContext";
import { TimeTrackerProvider } from "./context/TimeTrackerContext";
import { TimeEntriesProvider } from "./context/TimeEntriesContext";
import TimeTrackerWrapper from "./time-tracking/TimeTrackerWrapper";

export const metadata: Metadata = {
  title: "Design Elixir Tools",
  description: "Tools I needed but couldn't find",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-start-start">
      <TrackingProvider>
        <TimeTrackerProvider>
          <TimeEntriesProvider>
            <Navigation />
            <main >
              <TimeTrackerWrapper />
              <section className="flex-start-start flex-column full-width">
                {children}
              </section>
            </main>
          </TimeEntriesProvider>
        </TimeTrackerProvider>
      </TrackingProvider>
    </div>
  );
}